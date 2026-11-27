import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '@/database/database.service';
import { QueuesService } from '@/queues/queues.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesDto, InvoiceStatus } from './dto/list-invoices.dto';
import { TenancyStatus } from '@/tenancies/dto/assign-tenant.dto';
import { PaymentStatus } from '@/payments/dto/create-payment.dto';
import { generateReceiptNumber } from '@/common/utils/receipt-number.util';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { SendInvoiceDto, InvoiceDeliveryChannel } from './dto/send-invoice.dto';
import Decimal from 'decimal.js';
import { Temporal } from '@js-temporal/polyfill';
import { and, or } from '@prisma/orm-postgres/orm-client';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly queuesService: QueuesService,
  ) {}

  async create(managerId: string, dto: CreateInvoiceDto) {
    const issueDate = new Date(dto.issueDate);
    const dueDate = new Date(dto.dueDate);

    if (Number.isNaN(issueDate.getTime())) {
      throw new BadRequestException('Invalid issue date');
    }

    if (Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException('Invalid due date');
    }

    if (dueDate < issueDate) {
      this.logger.warn(
        `Invoice create rejected: dueDate ${dto.dueDate} is earlier than issueDate ${dto.issueDate}`,
      );
      throw new BadRequestException(
        'Due date cannot be earlier than issue date',
      );
    }

    const result = await this.prisma.db.transaction(async (tx) => {
      /*
       * 1. Find the active tenancy.
       */
      const tenancy = await tx.orm.public.Tenancy.where({
        id: dto.tenancyId,
        managerId,
        status: TenancyStatus.ACTIVE,
      }).first();

      if (!tenancy) {
        this.logger.warn(
          `Invoice create failed: tenancyId=${dto.tenancyId} managerId=${managerId} no active tenancy found`,
        );
        throw new NotFoundException('Active tenancy not found');
      }

      /*
       * 2. Verify the property belongs to the manager.
       */
      const property = await tx.orm.public.Property.where({
        id: tenancy.propertyId,
        managerId,
      }).first();

      if (!property) {
        this.logger.warn(
          `Invoice create failed: propertyId=${tenancy.propertyId} managerId=${managerId} not found`,
        );
        throw new NotFoundException('Property not found');
      }

      /*
       * 3. Verify the tenant belongs to the manager.
       */
      const tenant = await tx.orm.public.Tenant.where({
        id: tenancy.tenantId,
        managerId,
      }).first();

      if (!tenant) {
        this.logger.warn(
          `Invoice create failed: tenantId=${tenancy.tenantId} managerId=${managerId} not found`,
        );
        throw new NotFoundException('Tenant not found');
      }

      /*
       * 4. Load the property unit to get the market rent.
       */
      const propertyUnitId = tenancy.propertyUnitId;
      const propertyUnit = propertyUnitId
        ? await tx.orm.public.PropertyUnit.where({
            id: propertyUnitId,
            managerId,
            status: 'OCCUPIED',
          }).first()
        : null;

      if (!propertyUnit) {
        this.logger.warn(
          `Invoice create failed: propertyUnitId=${propertyUnitId} not found or not occupied`,
        );
        throw new NotFoundException('Property unit not found or not occupied');
      }

      /*
       * 5. Load service charges assigned to the tenancy's unit that were effective at the invoice date.
       */
      const unitCharges = propertyUnitId
        ? await tx.orm.public.PropertyUnitCharge.where((charge) =>
            and(
              charge.propertyUnitId.eq(propertyUnitId),
              charge.validFrom.lte(issueDate),
              or(charge.validTo.isNull(), charge.validTo.gt(issueDate)),
            ),
          ).all()
        : [];
      const propertyCharges =
        unitCharges.length > 0
          ? await tx.orm.public.PropertyCharge.where((charge) =>
              and(
                charge.managerId.eq(managerId),
                charge.propertyId.eq(property.id),
                charge.isActive.eq(true),
                charge.id.in(
                  unitCharges.map((unitCharge) => unitCharge.propertyChargeId),
                ),
              ),
            ).all()
          : [];
      const propertyChargeById = new Map(
        propertyCharges.map((charge) => [charge.id, charge]),
      );
      const charges = unitCharges.flatMap((unitCharge) => {
        const charge = propertyChargeById.get(unitCharge.propertyChargeId);

        if (!charge) {
          return [];
        }

        return [
          {
            unitCharge,
            description: charge.description ?? charge.name,
            amount: unitCharge.customAmount ?? charge.amount,
          },
        ];
      });

      /*
       * 6. Build the normal invoice lines.
       */
      const invoiceItems: Array<{
        unitCharge?: (typeof unitCharges)[number];
        description: string;
        quantity: string;
        unitAmount: string;
        totalAmount: string;
      }> = [];

      const rentAmount = new Decimal(String(propertyUnit.marketRent));

      invoiceItems.push({
        description: 'Monthly rent',
        quantity: '1',
        unitAmount: rentAmount.toFixed(2),
        totalAmount: rentAmount.toFixed(2),
      });

      for (const charge of charges) {
        const chargeAmount = new Decimal(String(charge.amount));

        if (chargeAmount.lessThanOrEqualTo(0)) {
          continue;
        }

        invoiceItems.push({
          description: charge.description,
          quantity: '1',
          unitAmount: chargeAmount.toFixed(2),
          totalAmount: chargeAmount.toFixed(2),
        });
      }

      /*
       * 6. Find previous invoices that may still have
       * outstanding balances.
       *
       * Do not rely only on status = PARTIALLY_PAID.
       * Recalculate the balance from:
       *
       * invoice total
       * - completed payment allocations
       * - amounts already transferred to later invoices
       */
      const previousInvoices = await tx.orm.public.Invoice.where({
        managerId,
        tenantId: tenant.id,
        tenancyId: tenancy.id,
        status: InvoiceStatus.PARTIALLY_PAID,
      }).all();

      const balancesToCarryForward: Array<{
        sourceInvoiceId: string;
        sourceInvoiceNumber: string;
        amount: Decimal;
      }> = [];

      for (const previousInvoice of previousInvoices) {
        /*
         * Get completed payment allocations applied
         * directly to this source invoice.
         */
        const paymentAllocations = await tx.orm.public.PaymentAllocation.where({
          managerId,
          invoiceId: previousInvoice.id,
        }).all();

        const allocationPaymentIds = [
          ...new Set(
            paymentAllocations.map(
              (allocation: any) => allocation.paymentId,
            ),
          ),
        ];

        const allocationPayments = allocationPaymentIds.length
          ? await tx.orm.public.Payment.where((payment) =>
              and(
                payment.managerId.eq(managerId),
                payment.id.in(allocationPaymentIds),
              ),
            ).all()
          : [];

        const successfulPaymentIds = new Set(
          allocationPayments
            .filter(
              (payment: any) => payment.status === PaymentStatus.SUCCESSFUL,
            )
            .map((payment: any) => payment.id),
        );

        const amountPaid = paymentAllocations
          .filter((allocation: any) =>
            successfulPaymentIds.has(allocation.paymentId),
          )
          .reduce((total, allocation) => {
            return total.plus(new Decimal(String(allocation.amount)));
          }, new Decimal(0));

        /*
         * Get balances already transferred from the
         * source invoice to previous target invoices.
         */
        const balanceTransfers =
          await tx.orm.public.InvoiceBalanceTransfer.where({
            managerId,
            sourceInvoiceId: previousInvoice.id,
          }).all();

        const amountTransferred = balanceTransfers.reduce((total, transfer) => {
          return total.plus(new Decimal(String(transfer.amount)));
        }, new Decimal(0));

        /*
         * The source invoice's remaining balance is:
         *
         * invoice total
         * - payments allocated to source invoice
         * - balance already carried forward
         */
        const sourceInvoiceTotal = new Decimal(
          String(previousInvoice.totalAmount),
        );

        const remainingBalance = Decimal.max(
          sourceInvoiceTotal.minus(amountPaid).minus(amountTransferred),
          new Decimal(0),
        );

        if (remainingBalance.greaterThan(0)) {
          balancesToCarryForward.push({
            sourceInvoiceId: previousInvoice.id,
            sourceInvoiceNumber: previousInvoice.invoiceNumber,
            amount: remainingBalance,
          });
        }
      }

      /*
       * 7. Add one balance-brought-forward line
       * to the new invoice.
       */
      const balanceBroughtForward = balancesToCarryForward.reduce(
        (total, balance) => total.plus(balance.amount),
        new Decimal(0),
      );

      if (balanceBroughtForward.greaterThan(0)) {
        invoiceItems.push({
          description: 'Balance brought forward',
          quantity: '1',
          unitAmount: balanceBroughtForward.toFixed(2),
          totalAmount: balanceBroughtForward.toFixed(2),
        });
      }

      /*
       * 9. Generate a unique invoice number.
       */
      const invoiceNumber = await this.generateInvoiceNumber();

      /*
       * 10. Create the new invoice as a draft while its line items are added.
       *
       * New invoices start with no payment allocations.
       */
      const draftInvoice = await tx.orm.public.Invoice.create({
        managerId,
        propertyId: property.id,
        tenancyId: tenancy.id,
        tenantId: tenant.id,
        invoiceNumber,
        issueDate,
        dueDate,
        subtotal: '0.00',
        totalAmount: '0.00',
        amountPaid: '0.00',
        balanceDue: '0.00',
        status: InvoiceStatus.DRAFT,
        notes: dto.notes,
      });

      /*
       * 11. Create invoice line items.
       */
      const createdInvoiceItems = [];

      for (const item of invoiceItems) {
        const createdItem = await tx.orm.public.InvoiceItem.create({
          invoiceId: draftInvoice.id,
          unitChargePropertyUnitId: item.unitCharge?.propertyUnitId,
          unitChargePropertyChargeId: item.unitCharge?.propertyChargeId,
          unitChargeValidFrom: item.unitCharge?.validFrom,
          description: item.description,
          quantity: item.quantity,
          unitAmount: item.unitAmount,
          totalAmount: item.totalAmount,
        });
        createdInvoiceItems.push(createdItem);
      }

      const subtotal = createdInvoiceItems.reduce(
        (total, item) => total.plus(new Decimal(String(item.totalAmount))),
        new Decimal(0),
      );

      if (subtotal.lessThanOrEqualTo(0)) {
        this.logger.warn(
          `Invoice create rejected: subtotal ${subtotal.toFixed(2)} is not greater than zero for tenancyId=${dto.tenancyId}`,
        );
        throw new BadRequestException(
          'Invoice subtotal must be greater than zero',
        );
      }

      const invoice = await tx.orm.public.Invoice.where({
        id: draftInvoice.id,
        managerId,
      }).update({
        subtotal: subtotal.toFixed(2),
        totalAmount: subtotal.toFixed(2),
        balanceDue: subtotal.toFixed(2),
        status: InvoiceStatus.ISSUED,
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found after creation');
      }

      /*
       * 12. Create one InvoiceBalanceTransfer row
       * for every source invoice.
       */
      for (const balance of balancesToCarryForward) {
        await tx.orm.public.InvoiceBalanceTransfer.create({
          managerId,
          sourceInvoiceId: balance.sourceInvoiceId,
          targetInvoiceId: invoice.id,
          amount: balance.amount.toFixed(2),
          transferredAt: issueDate,
          notes: `Balance carried forward from invoice ${balance.sourceInvoiceNumber}`,
        });
      }

      /*
       * 13. Apply unallocated balances from previous successful
       * payments (tenant credit) to the new invoice, oldest
       * payment first. Each application creates a payment
       * allocation and a receipt so the credit is visible on
       * both sides.
       */
      const prepaymentsApplied = await this.applyPaymentCredits(
        tx,
        managerId,
        invoice,
      );

      let amountPaid = new Decimal(0);
      let balanceDue = new Decimal(String(invoice.totalAmount));
      let finalStatus = invoice.status;

      if (prepaymentsApplied.length) {
        amountPaid = prepaymentsApplied.reduce(
          (total, applied) => total.plus(new Decimal(String(applied.amount))),
          new Decimal(0),
        );

        balanceDue = Decimal.max(
          new Decimal(String(invoice.totalAmount)).minus(amountPaid),
          new Decimal(0),
        );

        finalStatus = balanceDue.equals(0)
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID;

        await tx.orm.public.Invoice.where({
          id: invoice.id,
          managerId,
        }).update({
          amountPaid: amountPaid.toFixed(2),
          balanceDue: balanceDue.toFixed(2),
          status: finalStatus,
        });
      }

      /*
       * 14. Return the invoice and a useful calculation
       * summary for the API response.
       */
      const serviceChargesTotal = charges.reduce((total, charge) => {
        const chargeAmount = new Decimal(String(charge.amount));

        if (chargeAmount.lessThanOrEqualTo(0)) {
          return total;
        }

        return total.plus(chargeAmount);
      }, new Decimal(0));

      const finalInvoice =
        (await tx.orm.public.Invoice.where({
          id: invoice.id,
          managerId,
        }).first()) ?? invoice;

      return {
        invoice: finalInvoice,
        invoiceItems: createdInvoiceItems,
        calculation: {
          rent: rentAmount.toFixed(2),
          serviceCharges: serviceChargesTotal.toFixed(2),
          balanceBroughtForward: balanceBroughtForward.toFixed(2),
          subtotal: subtotal.toFixed(2),
          totalAmount: subtotal.toFixed(2),
          amountPaid: amountPaid.toFixed(2),
          balanceDue: balanceDue.toFixed(2),
        },
        balanceTransfers: balancesToCarryForward.map((balance) => ({
          sourceInvoiceId: balance.sourceInvoiceId,
          sourceInvoiceNumber: balance.sourceInvoiceNumber,
          amount: balance.amount.toFixed(2),
          targetInvoiceId: invoice.id,
        })),
        prepaymentsApplied,
      };
    });

    this.logger.log(
      `Invoice created: id=${result.invoice.id} number=${result.invoice.invoiceNumber} total=${result.invoice.totalAmount} status=${result.invoice.status} managerId=${managerId}`,
    );

    return result;
  }

  /**
   * Apply unallocated balances from the tenant's previous
   * successful payments to a newly created invoice.
   *
   * Payments are consumed oldest-first. Each application creates
   * a PaymentAllocation against the new invoice plus a Receipt,
   * so the prepayment shows up as amountPaid on the invoice and
   * as a receipt on the payment.
   */
  private async applyPaymentCredits(
    tx: any,
    managerId: string,
    invoice: any,
  ) {
    const payments = await tx.orm.public.Payment.where({
      managerId,
      tenantId: invoice.tenantId,
      propertyId: invoice.propertyId,
      status: PaymentStatus.SUCCESSFUL,
    }).all();

    const ordered = payments.sort(
      (a: any, b: any) =>
        new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime(),
    );

    let creditRemaining = new Decimal(String(invoice.totalAmount));
    const applied: Array<{
      paymentId: string;
      allocationId: string;
      receiptId: string;
      amount: string;
    }> = [];

    for (const payment of ordered) {
      if (!creditRemaining.greaterThan(0)) {
        break;
      }

      const allocations = await tx.orm.public.PaymentAllocation.where({
        managerId,
        paymentId: payment.id,
      }).all();

      const allocatedAmount = allocations.reduce(
        (total: Decimal, allocation: any) =>
          total.plus(new Decimal(String(allocation.amount))),
        new Decimal(0),
      );

      const remainder = new Decimal(String(payment.amount)).minus(
        allocatedAmount,
      );

      if (!remainder.greaterThan(0)) {
        continue;
      }

      const amount = Decimal.min(remainder, creditRemaining);

      const allocation = await tx.orm.public.PaymentAllocation.create({
        managerId,
        paymentId: payment.id,
        invoiceId: invoice.id,
        amount: amount.toFixed(2),
        kind: 'PREPAYMENT',
        allocatedAt: new Date(),
        notes: 'Unallocated payment balance applied to invoice',
      });

      const receipt = await tx.orm.public.Receipt.create({
        managerId,
        paymentId: payment.id,
        paymentAllocationId: allocation.id,
        amount: amount.toFixed(2),
        receiptNumber: generateReceiptNumber(),
        issuedAt: new Date(),
        notes: 'Prepayment applied to invoice',
      });

      applied.push({
        paymentId: payment.id,
        allocationId: allocation.id,
        receiptId: receipt.id,
        amount: amount.toFixed(2),
      });

      creditRemaining = creditRemaining.minus(amount);
    }

    return applied;
  }

  async findAll(
    managerId: string,
    query: ListInvoicesDto,
  ): Promise<{
    data: unknown[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      this.prisma.db.orm.public.Invoice.where((invoice) =>
        and(
          invoice.managerId.eq(managerId),
          ...(query.status ? [invoice.status.eq(query.status)] : []),
          ...(query.invoiceNumber
            ? [invoice.invoiceNumber.ilike(`%${query.invoiceNumber}%`)]
            : []),
          ...(query.propertyId
            ? [invoice.propertyId.eq(query.propertyId)]
            : []),
          ...(query.tenantId ? [invoice.tenantId.eq(query.tenantId)] : []),
          ...(query.fromDate
            ? [
                invoice.issueDate.gte(
                  Temporal.PlainDate.from(query.fromDate.slice(0, 10)),
                ),
              ]
            : []),
          ...(query.toDate
            ? [
                invoice.issueDate.lte(
                  Temporal.PlainDate.from(query.toDate.slice(0, 10)),
                ),
              ]
            : []),
        ),
      )
        .offset(skip)
        .limit(limit)
        .all(),
      this.prisma.db.orm.public.Invoice.where((invoice) =>
        and(
          invoice.managerId.eq(managerId),
          ...(query.status ? [invoice.status.eq(query.status)] : []),
          ...(query.invoiceNumber
            ? [invoice.invoiceNumber.ilike(`%${query.invoiceNumber}%`)]
            : []),
          ...(query.propertyId
            ? [invoice.propertyId.eq(query.propertyId)]
            : []),
          ...(query.tenantId ? [invoice.tenantId.eq(query.tenantId)] : []),
          ...(query.fromDate
            ? [
                invoice.issueDate.gte(
                  Temporal.PlainDate.from(query.fromDate.slice(0, 10)),
                ),
              ]
            : []),
          ...(query.toDate
            ? [
                invoice.issueDate.lte(
                  Temporal.PlainDate.from(query.toDate.slice(0, 10)),
                ),
              ]
            : []),
        ),
      ).aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);

    const invoiceIds = invoices.map((i: any) => i.id);
    const tenancyIds = invoices.map((i: any) => i.tenancyId);
    const propertyIds = invoices.map((i: any) => i.propertyId);
    const tenantIds = invoices.map((i: any) => i.tenantId);

    const [tenants, properties, tenancies, payments, invoiceItems] =
      await Promise.all([
        tenantIds.length
          ? this.prisma.db.orm.public.Tenant.where((tenant) =>
              tenant.id.in(tenantIds),
            ).all()
          : [],
        propertyIds.length
          ? this.prisma.db.orm.public.Property.where((property) =>
              property.id.in(propertyIds),
            ).all()
          : [],
        tenancyIds.length
          ? this.prisma.db.orm.public.Tenancy.where((tenancy) =>
              tenancy.id.in(tenancyIds),
            ).all()
          : [],
        invoiceIds.length
          ? this.prisma.db.orm.public.Payment.where((payment) =>
              and(
                payment.invoiceId.in(invoiceIds),
                payment.managerId.eq(managerId),
                payment.status.eq(PaymentStatus.SUCCESSFUL),
              ),
            ).all()
          : [],
        invoiceIds.length
          ? this.prisma.db.orm.public.InvoiceItem.where((item) =>
              item.invoiceId.in(invoiceIds),
            ).all()
          : [],
      ]);

    const tenantById = new Map(tenants.map((t: any) => [t.id, t]));
    const propertyById = new Map(properties.map((p: any) => [p.id, p]));
    const tenancyById = new Map(tenancies.map((t: any) => [t.id, t]));

    const propertyUnitIds = tenancies.map((t: any) => t.propertyUnitId);
    const propertyUnits = propertyUnitIds.length
      ? await this.prisma.db.orm.public.PropertyUnit.where((unit) =>
          unit.id.in(propertyUnitIds),
        ).all()
      : [];
    const propertyUnitById = new Map(propertyUnits.map((u: any) => [u.id, u]));

    const invoiceItemsByInvoiceId = new Map<string, any[]>();
    for (const item of invoiceItems) {
      const existing = invoiceItemsByInvoiceId.get(item.invoiceId) || [];
      existing.push(item);
      invoiceItemsByInvoiceId.set(item.invoiceId, existing);
    }

    const paymentDatesByInvoiceId = new Map<string, Date>();
    for (const payment of payments) {
      const existing = paymentDatesByInvoiceId.get(payment.invoiceId);
      if (!existing || new Date(payment.paymentDate) < existing) {
        paymentDatesByInvoiceId.set(
          payment.invoiceId,
          new Date(payment.paymentDate),
        );
      }
    }

    const enrichedData = invoices.map((invoice: any) => {
      const tenant = tenantById.get(invoice.tenantId);
      const property = propertyById.get(invoice.propertyId);
      const tenancy = tenancyById.get(invoice.tenancyId);
      const propertyUnit = tenancy ? propertyUnitById.get(tenancy.propertyUnitId) : null;
      const paidDate = paymentDatesByInvoiceId.get(invoice.id);
      const items = invoiceItemsByInvoiceId.get(invoice.id) || [];

      return {
        ...invoice,
        tenant,
        property,
        propertyUnit,
        paidDate,
        invoiceItems: items,
      };
    });

    const totalPages = Math.ceil(Number(total.total) / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      data: enrichedData,
      pagination: {
        page,
        limit,
        total: Number(total.total),
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  async findOne(managerId: string, invoiceId: string) {
    const invoice = await this.prisma.db.orm.public.Invoice.where({
      id: invoiceId,
      managerId,
    }).first();

    if (!invoice) {
      this.logger.warn(
        `Invoice lookup failed: id=${invoiceId} managerId=${managerId} not found`,
      );
      throw new NotFoundException('Invoice not found');
    }

    const items = await this.prisma.db.orm.public.InvoiceItem.where({
      invoiceId: invoice.id,
    }).all();

    const payments = await this.prisma.db.orm.public.Payment.where({
      invoiceId: invoice.id,
      managerId,
    }).all();

    const paymentAllocations =
      await this.prisma.db.orm.public.PaymentAllocation.where({
        invoiceId: invoice.id,
        managerId,
      }).all();

    const creditApplied = paymentAllocations
      .filter((allocation: any) => allocation.kind === 'PREPAYMENT')
      .reduce(
        (total: Decimal, allocation: any) =>
          total.plus(new Decimal(String(allocation.amount))),
        new Decimal(0),
      );

    return {
      ...invoice,
      items,
      payments,
      paymentAllocations,
      creditApplied: creditApplied.toFixed(2),
    };
  }

  async update(managerId: string, invoiceId: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(managerId, invoiceId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      this.logger.warn(
        `Invoice update rejected: id=${invoiceId} status=${invoice.status} is not DRAFT`,
      );
      throw new ConflictException('Only draft invoices can be edited');
    }

    if (dto.dueDate && new Date(dto.dueDate) < invoice.issueDate) {
      this.logger.warn(
        `Invoice update rejected: id=${invoiceId} dueDate ${dto.dueDate} is earlier than issueDate`,
      );
      throw new BadRequestException(
        'Due date cannot be earlier than issue date',
      );
    }

    const updated = await this.prisma.db.orm.public.Invoice.where({
      id: invoiceId,
      managerId,
    }).update({
      ...(dto.dueDate ? { dueDate: new Date(dto.dueDate) } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    });

    this.logger.log(`Invoice updated: id=${invoiceId} managerId=${managerId}`);

    return updated;
  }

  async cancel(managerId: string, invoiceId: string) {
    const invoice = await this.findOne(managerId, invoiceId);

    if (invoice.status === InvoiceStatus.PAID) {
      this.logger.warn(
        `Invoice cancel rejected: id=${invoiceId} is already PAID`,
      );
      throw new ConflictException('A paid invoice cannot be cancelled');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      return invoice;
    }

    if (Number(invoice.amountPaid) > 0) {
      this.logger.warn(
        `Invoice cancel rejected: id=${invoiceId} has payments (amountPaid=${invoice.amountPaid})`,
      );
      throw new ConflictException(
        'An invoice with payments cannot be cancelled',
      );
    }

    const cancelled = await this.prisma.db.orm.public.Invoice.where({
      id: invoiceId,
      managerId,
    }).update({
      status: InvoiceStatus.CANCELLED,
    });

    this.logger.log(`Invoice cancelled: id=${invoiceId} managerId=${managerId}`);

    return cancelled;
  }

  async markOverdueInvoices(managerId?: string) {
    const where: Record<string, unknown> = {
      status: InvoiceStatus.ISSUED,
      dueDate: {
        lt: new Date(),
      },
    };

    if (managerId) {
      where.managerId = managerId;
    }

    const overdueInvoices =
      await this.prisma.db.orm.public.Invoice.where(where).all();

    for (const invoice of overdueInvoices) {
      await this.prisma.db.orm.public.Invoice.where({
        id: invoice.id,
        managerId: invoice.managerId,
      }).update({
        status: InvoiceStatus.OVERDUE,
      });
    }

    if (overdueInvoices.length > 0) {
      this.logger.log(
        `Marked ${overdueInvoices.length} invoice(s) as OVERDUE${managerId ? ` for managerId=${managerId}` : ''}`,
      );
    }

    return {
      updated: overdueInvoices.length,
    };
  }

  async getForDelivery(managerId: string, invoiceId: string) {
    const invoice = await this.findOne(managerId, invoiceId);

    const tenant = await this.prisma.db.orm.public.Tenant.where({
      id: invoice.tenantId,
      managerId,
    }).first();

    const property = await this.prisma.db.orm.public.Property.where({
      id: invoice.propertyId,
      managerId,
    }).first();

    return {
      ...invoice,
      tenant,
      property,
    };
  }

  async queueDelivery(
    managerId: string,
    invoiceId: string,
    dto: SendInvoiceDto,
  ) {
    const invoice = await this.getForDelivery(managerId, invoiceId);

    if (
      !invoice.tenant?.email &&
      dto.channels.includes(InvoiceDeliveryChannel.EMAIL)
    ) {
      this.logger.warn(
        `Invoice delivery rejected: invoiceId=${invoiceId} tenant has no email for EMAIL channel`,
      );
      throw new BadRequestException('Tenant does not have an email address');
    }

    if (
      !invoice.tenant?.phone &&
      dto.channels.includes(InvoiceDeliveryChannel.SMS)
    ) {
      this.logger.warn(
        `Invoice delivery rejected: invoiceId=${invoiceId} tenant has no phone for SMS channel`,
      );
      throw new BadRequestException('Tenant does not have a phone number');
    }

    this.logger.log(
      `Invoice delivery queued: invoiceId=${invoiceId} managerId=${managerId} channels=${dto.channels.join(',')}`,
    );

    await this.queuesService.publishInvoiceDelivery({
      managerId,
      invoiceId,
      channels: dto.channels,
    });

    return {
      message: 'Invoice delivery queued',
      invoiceId,
      channels: dto.channels,
    };
  }

  private async generateInvoiceNumber() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const random = Math.floor(100000 + Math.random() * 900000);

    return `INV-${date}-${random}`;
  }
}
