import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { and } from '@prisma/orm-postgres/orm-client';

import { DatabaseService } from '@/database/database.service';
import { money } from '@/common/utils/money.util';
import { generateReceiptNumber } from '@/common/utils/receipt-number.util';
import {
  CreatePaymentDto,
  PaymentAllocationRequestDto,
  PaymentStatus,
} from './dto/create-payment.dto';
import { InvoiceStatus } from '@/invoices/dto/list-invoices.dto';

const OUTSTANDING_INVOICE_STATUSES = [
  InvoiceStatus.ISSUED,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

interface AllocationPlanItem {
  invoiceId: string;
  amount: Decimal;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: DatabaseService) {}

  async create(managerId: string, dto: CreatePaymentDto) {
    const paymentAmount = money(dto.amount);
    const paymentDate = new Date(dto.paymentDate);
    const idempotencyKey =
      dto.idempotencyKey ??
      `payment-${Date.now()}-${crypto.randomUUID()}`;

    if (!paymentAmount.greaterThan(0)) {
      this.logger.warn(
        `Payment create rejected: amount ${dto.amount} is not greater than zero`,
      );
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    if (Number.isNaN(paymentDate.getTime())) {
      this.logger.warn(`Payment create rejected: invalid paymentDate "${dto.paymentDate}"`);
      throw new BadRequestException('Invalid payment date');
    }

    const existing = await this.prisma.db.orm.public.IdempotencyKey.where({
      key: idempotencyKey,
      managerId,
    }).first();

    if (existing) {
      this.logger.log(
        `Payment create idempotent replay: key=${idempotencyKey} managerId=${managerId}`,
      );
      return existing.response;
    }

    const result = await this.prisma.db.transaction(async (tx) => {
      const invoice = await tx.orm.public.Invoice.where({
        id: dto.invoiceId,
        managerId,
      }).first();

      if (!invoice) {
        this.logger.warn(
          `Payment create failed: invoiceId=${dto.invoiceId} managerId=${managerId} not found`,
        );
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.status === InvoiceStatus.CANCELLED) {
        this.logger.warn(
          `Payment create rejected: invoiceId=${dto.invoiceId} is CANCELLED`,
        );
        throw new BadRequestException('Cannot pay a cancelled invoice');
      }

      const plan = await this.buildAllocationPlan(
        tx,
        managerId,
        invoice,
        paymentAmount,
        dto.allocations,
      );

      const payment = await tx.orm.public.Payment.create({
        managerId,
        propertyId: invoice.propertyId,
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
        paymentDate,
        amount: paymentAmount.toFixed(2),
        paymentMethod: dto.paymentMethod,
        referenceNumber: dto.referenceNumber,
        notes: dto.notes,
        status: PaymentStatus.SUCCESSFUL,
      });

      const allocations = [];
      const receipts = [];

      for (const item of plan) {
        const allocation = await tx.orm.public.PaymentAllocation.create({
          managerId,
          paymentId: payment.id,
          invoiceId: item.invoiceId,
          amount: item.amount.toFixed(2),
          allocatedAt: new Date(),
          notes: 'Payment allocation',
        });

        allocations.push(allocation);
        receipts.push(
          await this.createReceiptForAllocation(
            tx,
            managerId,
            payment.id,
            allocation.id,
            item.amount,
          ),
        );
      }

      const allocatedTotal = plan.reduce(
        (total, item) => total.plus(item.amount),
        new Decimal(0),
      );

      const unallocatedAmount = paymentAmount.minus(allocatedTotal);

      /*
       * Any remainder is tenant credit. Issue a receipt for it so the
       * full payment amount is accounted for; it resolves to the
       * anchor invoice and can be applied to future invoices later.
       */
      if (unallocatedAmount.greaterThan(0)) {
        receipts.push(
          await tx.orm.public.Receipt.create({
            managerId,
            paymentId: payment.id,
            amount: unallocatedAmount.toFixed(2),
            receiptNumber: generateReceiptNumber(),
            issuedAt: new Date(),
            notes: 'Unallocated payment balance carried forward',
          }),
        );
      }

      const affectedInvoiceIds = [
        ...new Set(plan.map((item) => item.invoiceId)),
      ];

      const invoices = [];

      for (const invoiceId of affectedInvoiceIds) {
        const target = await tx.orm.public.Invoice.where({
          id: invoiceId,
          managerId,
        }).first();

        if (!target) {
          continue;
        }

        const totals = await this.calculateInvoiceTotals(
          tx,
          managerId,
          invoiceId,
        );

        await tx.orm.public.Invoice.where({
          id: invoiceId,
          managerId,
        }).update({
          amountPaid: totals.amountPaid.toFixed(2),
          balanceDue: totals.balanceDue.toFixed(2),
          status: this.invoiceStatus(
            totals.amountPaid,
            totals.balanceDue,
            target.status,
          ),
        });

        invoices.push({
          id: invoiceId,
          invoiceNumber: target.invoiceNumber,
          amountPaid: totals.amountPaid.toFixed(2),
          balanceDue: totals.balanceDue.toFixed(2),
          status: this.invoiceStatus(
            totals.amountPaid,
            totals.balanceDue,
            target.status,
          ),
        });
      }

      return {
        payment,
        allocations,
        receipts,
        invoices,
        unallocatedAmount: unallocatedAmount.toFixed(2),
      };
    });

    await this.prisma.db.orm.public.IdempotencyKey.create({
      key: idempotencyKey,
      managerId,
      endpoint: 'POST /payments',
      response: result,
    });

    this.logger.log(
      `Payment created: id=${result.payment.id} amount=${result.payment.amount} invoiceId=${dto.invoiceId} allocations=${result.allocations.length} receipts=${result.receipts.length} unallocated=${result.unallocatedAmount} managerId=${managerId}`,
    );

    return result;
  }

  /**
   * Decide how a payment is split across invoices.
   *
   * Explicit allocations are validated and merged per invoice.
   * Without them the payment is distributed oldest-first across the
   * tenant's outstanding invoices for the same property. Any amount
   * left over stays unallocated on the payment.
   */
  private async buildAllocationPlan(
    tx: any,
    managerId: string,
    anchorInvoice: any,
    paymentAmount: Decimal,
    requested?: PaymentAllocationRequestDto[],
  ): Promise<AllocationPlanItem[]> {
    if (requested?.length) {
      return this.explicitAllocationPlan(
        tx,
        managerId,
        anchorInvoice,
        paymentAmount,
        requested,
      );
    }

    return this.autoAllocationPlan(tx, managerId, anchorInvoice, paymentAmount);
  }

  private async explicitAllocationPlan(
    tx: any,
    managerId: string,
    anchorInvoice: any,
    paymentAmount: Decimal,
    requested: PaymentAllocationRequestDto[],
  ): Promise<AllocationPlanItem[]> {
    const merged = new Map<string, Decimal>();

    for (const item of requested) {
      const amount = money(item.amount);

      if (!amount.greaterThan(0)) {
        this.logger.warn(
          `Payment allocation plan rejected: amount ${item.amount} for invoice ${item.invoiceId} is not greater than zero`,
        );
        throw new BadRequestException(
          'Allocation amount must be greater than zero',
        );
      }

      merged.set(
        item.invoiceId,
        (merged.get(item.invoiceId) ?? new Decimal(0)).plus(amount),
      );
    }

    const requestedTotal = [...merged.values()].reduce(
      (total, amount) => total.plus(amount),
      new Decimal(0),
    );

    if (requestedTotal.greaterThan(paymentAmount)) {
      this.logger.warn(
        `Payment allocation plan rejected: total ${requestedTotal.toFixed(2)} exceeds payment amount ${paymentAmount.toFixed(2)}`,
      );
      throw new BadRequestException(
        'Allocation plan exceeds the payment amount',
      );
    }

    const plan: AllocationPlanItem[] = [];

    for (const [invoiceId, amount] of merged) {
      const target = await tx.orm.public.Invoice.where({
        id: invoiceId,
        managerId,
      }).first();

      if (!target) {
        this.logger.warn(
          `Payment allocation plan failed: invoiceId=${invoiceId} not found`,
        );
        throw new NotFoundException(`Invoice ${invoiceId} not found`);
      }

      if (target.status === InvoiceStatus.CANCELLED) {
        this.logger.warn(
          `Payment allocation plan rejected: invoice ${target.invoiceNumber} is CANCELLED`,
        );
        throw new BadRequestException(
          `Cannot allocate payment to cancelled invoice ${target.invoiceNumber}`,
        );
      }

      if (
        target.tenantId !== anchorInvoice.tenantId ||
        target.propertyId !== anchorInvoice.propertyId
      ) {
        this.logger.warn(
          `Payment allocation plan rejected: invoice ${target.invoiceNumber} belongs to a different tenant/property`,
        );
        throw new BadRequestException(
          'Allocation invoices must belong to the same tenant and property as the payment',
        );
      }

      const outstanding = await this.getInvoiceOutstanding(
        tx,
        managerId,
        target,
      );

      if (amount.greaterThan(outstanding)) {
        this.logger.warn(
          `Payment allocation plan rejected: amount ${amount.toFixed(2)} exceeds outstanding ${outstanding.toFixed(2)} on invoice ${target.invoiceNumber}`,
        );
        throw new BadRequestException(
          `Allocation exceeds the outstanding amount of ${outstanding.toFixed(2)} on invoice ${target.invoiceNumber}`,
        );
      }

      plan.push({ invoiceId, amount });
    }

    return plan;
  }

  private async autoAllocationPlan(
    tx: any,
    managerId: string,
    anchorInvoice: any,
    paymentAmount: Decimal,
  ): Promise<AllocationPlanItem[]> {
    const candidates = await tx.orm.public.Invoice.where({
      managerId,
      tenantId: anchorInvoice.tenantId,
      propertyId: anchorInvoice.propertyId,
    }).all();

    const outstandingInvoices = candidates
      .filter((candidate: any) =>
        OUTSTANDING_INVOICE_STATUSES.includes(candidate.status),
      )
      .sort(
        (a: any, b: any) =>
          new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime(),
      );

    const plan: AllocationPlanItem[] = [];
    let remaining = paymentAmount;

    for (const candidate of outstandingInvoices) {
      if (!remaining.greaterThan(0)) {
        break;
      }

      const outstanding = await this.getInvoiceOutstanding(
        tx,
        managerId,
        candidate,
      );

      const amount = Decimal.min(remaining, outstanding);

      if (amount.greaterThan(0)) {
        plan.push({ invoiceId: candidate.id, amount });
        remaining = remaining.minus(amount);
      }
    }

    return plan;
  }

  /**
   * Outstanding = invoice total - successful payment allocations
   * - balances already transferred to later invoices.
   */
  private async getInvoiceOutstanding(
    tx: any,
    managerId: string,
    invoice: any,
  ): Promise<Decimal> {
    const allocations = await tx.orm.public.PaymentAllocation.where({
      managerId,
      invoiceId: invoice.id,
    }).all();

    const paidAmount = await this.sumSuccessfulAllocations(
      tx,
      managerId,
      allocations,
    );

    const transfers = await tx.orm.public.InvoiceBalanceTransfer.where({
      managerId,
      sourceInvoiceId: invoice.id,
    }).all();

    const transferredAmount = transfers.reduce(
      (total: Decimal, transfer: any) => total.plus(money(transfer.amount)),
      new Decimal(0),
    );

    return Decimal.max(
      money(invoice.totalAmount).minus(paidAmount).minus(transferredAmount),
      0,
    );
  }

  /**
   * Sum allocation amounts whose payment is still SUCCESSFUL.
   * Allocations belonging to reversed or failed payments do not
   * count toward the invoice balance.
   */
  private async sumSuccessfulAllocations(
    tx: any,
    managerId: string,
    allocations: any[],
  ): Promise<Decimal> {
    if (!allocations.length) {
      return new Decimal(0);
    }

    const paymentIds = [
      ...new Set(allocations.map((allocation: any) => allocation.paymentId)),
    ];

    const payments = await tx.orm.public.Payment.where((payment: any) =>
      and(payment.managerId.eq(managerId), payment.id.in(paymentIds)),
    ).all();

    const successfulPaymentIds = new Set(
      payments
        .filter((payment: any) => payment.status === PaymentStatus.SUCCESSFUL)
        .map((payment: any) => payment.id),
    );

    return allocations
      .filter((allocation: any) =>
        successfulPaymentIds.has(allocation.paymentId),
      )
      .reduce(
        (total: Decimal, allocation: any) =>
          total.plus(money(allocation.amount)),
        new Decimal(0),
      );
  }

  private async createReceiptForAllocation(
    tx: any,
    managerId: string,
    paymentId: string,
    paymentAllocationId: string,
    amount: Decimal,
  ) {
    return tx.orm.public.Receipt.create({
      managerId,
      paymentId,
      paymentAllocationId,
      amount: amount.toFixed(2),
      receiptNumber: generateReceiptNumber(),
      issuedAt: new Date(),
    });
  }

  async allocateExistingPayment(
    managerId: string,
    paymentId: string,
    invoiceId: string,
    amount: string,
    notes?: string,
    idempotencyKey?: string,
  ) {
    const requestedAmount = money(amount);

    if (idempotencyKey) {
      const existing = await this.prisma.db.orm.public.IdempotencyKey.where({
        key: idempotencyKey,
        managerId,
      }).first();

      if (existing) {
        this.logger.log(
          `Payment allocation idempotent replay: key=${idempotencyKey} managerId=${managerId}`,
        );
        return existing.response;
      }
    }

    if (!requestedAmount.greaterThan(0)) {
      this.logger.warn(
        `Payment allocation rejected: amount ${amount} is not greater than zero`,
      );
      throw new BadRequestException(
        'Allocation amount must be greater than zero',
      );
    }

    const result = await this.prisma.db.transaction(async (tx) => {
      const payment = await tx.orm.public.Payment.where({
        id: paymentId,
        managerId,
        status: PaymentStatus.SUCCESSFUL,
      }).first();

      if (!payment) {
        this.logger.warn(
          `Payment allocation failed: paymentId=${paymentId} managerId=${managerId} no successful payment found`,
        );
        throw new NotFoundException('Successful payment not found');
      }

      const invoice = await tx.orm.public.Invoice.where({
        id: invoiceId,
        managerId,
      }).first();

      if (!invoice) {
        this.logger.warn(
          `Payment allocation failed: invoiceId=${invoiceId} managerId=${managerId} not found`,
        );
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.status === InvoiceStatus.CANCELLED) {
        this.logger.warn(
          `Payment allocation rejected: invoiceId=${invoiceId} is CANCELLED`,
        );
        throw new BadRequestException(
          'Cannot allocate payment to a cancelled invoice',
        );
      }

      if (
        payment.tenantId !== invoice.tenantId ||
        payment.propertyId !== invoice.propertyId
      ) {
        this.logger.warn(
          `Payment allocation rejected: paymentId=${paymentId} and invoiceId=${invoiceId} belong to different tenant/property`,
        );
        throw new BadRequestException(
          'Payment and invoice must belong to the same tenant and property',
        );
      }

      const paymentAllocated = await this.paymentAllocatedAmount(
        tx,
        managerId,
        paymentId,
      );

      const paymentRemaining = money(payment.amount).minus(paymentAllocated);

      if (requestedAmount.greaterThan(paymentRemaining)) {
        this.logger.warn(
          `Payment allocation rejected: amount ${requestedAmount.toFixed(2)} exceeds payment remaining ${paymentRemaining.toFixed(2)} for paymentId=${paymentId}`,
        );
        throw new BadRequestException(
          'Allocation exceeds unallocated payment amount',
        );
      }

      const invoiceTotals = await this.calculateInvoiceTotals(
        tx,
        managerId,
        invoiceId,
      );

      if (requestedAmount.greaterThan(invoiceTotals.balanceDue)) {
        this.logger.warn(
          `Payment allocation rejected: amount ${requestedAmount.toFixed(2)} exceeds invoice balance ${invoiceTotals.balanceDue.toFixed(2)} for invoiceId=${invoiceId}`,
        );
        throw new BadRequestException('Allocation exceeds invoice balance');
      }

      const allocation = await tx.orm.public.PaymentAllocation.create({
        managerId,
        paymentId,
        invoiceId,
        amount: requestedAmount.toFixed(2),
        allocatedAt: new Date(),
        notes,
      });

      const receipt = await this.createReceiptForAllocation(
        tx,
        managerId,
        paymentId,
        allocation.id,
        requestedAmount,
      );

      const updatedInvoiceTotals = await this.calculateInvoiceTotals(
        tx,
        managerId,
        invoiceId,
      );

      await tx.orm.public.Invoice.where({
        id: invoiceId,
        managerId,
      }).update({
        amountPaid: updatedInvoiceTotals.amountPaid.toFixed(2),
        balanceDue: updatedInvoiceTotals.balanceDue.toFixed(2),
        status: this.invoiceStatus(
          updatedInvoiceTotals.amountPaid,
          updatedInvoiceTotals.balanceDue,
          invoice.status,
        ),
      });

      return {
        allocation,
        receipt,
        invoice: {
          id: invoiceId,
          amountPaid: updatedInvoiceTotals.amountPaid.toFixed(2),
          balanceDue: updatedInvoiceTotals.balanceDue.toFixed(2),
          status: this.invoiceStatus(
            updatedInvoiceTotals.amountPaid,
            updatedInvoiceTotals.balanceDue,
            invoice.status,
          ),
        },
      };
    });

    if (idempotencyKey) {
      await this.prisma.db.orm.public.IdempotencyKey.create({
        key: idempotencyKey!,
        managerId,
        endpoint: `POST /payments/${paymentId}/allocations`,
        response: result,
      });
    }

    this.logger.log(
      `Payment allocated: paymentId=${paymentId} invoiceId=${invoiceId} amount=${requestedAmount.toFixed(2)} allocationId=${result.allocation.id} receiptId=${result.receipt.id} managerId=${managerId}`,
    );

    return result;
  }

  async reversePayment(
    managerId: string,
    paymentId: string,
    idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      const existing = await this.prisma.db.orm.public.IdempotencyKey.where({
        key: idempotencyKey,
        managerId,
      }).first();

      if (existing) {
        this.logger.log(
          `Payment reversal idempotent replay: key=${idempotencyKey} managerId=${managerId}`,
        );
        return existing.response;
      }
    }

    const result = await this.prisma.db.transaction(async (tx) => {
      const payment = await tx.orm.public.Payment.where({
        id: paymentId,
        managerId,
      }).first();

      if (!payment) {
        this.logger.warn(
          `Payment reversal failed: paymentId=${paymentId} managerId=${managerId} not found`,
        );
        throw new NotFoundException('Payment not found');
      }

      if (payment.status === PaymentStatus.REVERSED) {
        this.logger.warn(
          `Payment reversal rejected: paymentId=${paymentId} is already REVERSED`,
        );
        throw new BadRequestException('Payment is already reversed');
      }

      const allocations = await tx.orm.public.PaymentAllocation.where({
        managerId,
        paymentId,
      }).all();

      const affectedInvoiceIds = [
        ...new Set(allocations.map((allocation: any) => allocation.invoiceId)),
      ];

      await tx.orm.public.Payment.where({
        id: paymentId,
        managerId,
      }).update({
        status: PaymentStatus.REVERSED,
      });

      for (const invoiceId of affectedInvoiceIds) {
        const invoice = await tx.orm.public.Invoice.where({
          id: invoiceId,
          managerId,
        }).first();

        if (!invoice) {
          continue;
        }

        const totals = await this.calculateInvoiceTotals(
          tx,
          managerId,
          invoiceId,
        );

        await tx.orm.public.Invoice.where({
          id: invoiceId,
          managerId,
        }).update({
          amountPaid: totals.amountPaid.toFixed(2),
          balanceDue: totals.balanceDue.toFixed(2),
          status: this.invoiceStatus(
            totals.amountPaid,
            totals.balanceDue,
            invoice.status,
          ),
        });
      }

      return {
        paymentId,
        status: PaymentStatus.REVERSED,
        affectedInvoiceIds,
      };
    });

    if (idempotencyKey) {
      await this.prisma.db.orm.public.IdempotencyKey.create({
        key: idempotencyKey,
        managerId,
        endpoint: `POST /payments/${paymentId}/reverse`,
        response: result,
      });
    }

    this.logger.log(
      `Payment reversed: paymentId=${paymentId} affectedInvoices=${result.affectedInvoiceIds.length} managerId=${managerId}`,
    );

    return result;
  }

  async findAll(managerId: string) {
    return this.prisma.db.orm.public.Payment.where({
      managerId,
    }).all();
  }

  async findOne(managerId: string, paymentId: string) {
    const payment = await this.prisma.db.orm.public.Payment.where({
      id: paymentId,
      managerId,
    }).first();

    if (!payment) {
      this.logger.warn(
        `Payment lookup failed: id=${paymentId} managerId=${managerId} not found`,
      );
      throw new NotFoundException('Payment not found');
    }

    const allocations = await this.prisma.db.orm.public.PaymentAllocation.where(
      {
        managerId,
        paymentId,
      },
    ).all();

    const receipts = await this.prisma.db.orm.public.Receipt.where({
      managerId,
      paymentId,
    }).all();

    return {
      ...payment,
      allocations,
      receipts,
    };
  }

  private async calculateInvoiceTotals(
    tx: any,
    managerId: string,
    invoiceId: string,
  ) {
    const invoice = await tx.orm.public.Invoice.where({
      id: invoiceId,
      managerId,
    }).first();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const allocations = await tx.orm.public.PaymentAllocation.where({
      managerId,
      invoiceId,
    }).all();

    const transfers = await tx.orm.public.InvoiceBalanceTransfer.where({
      managerId,
      sourceInvoiceId: invoiceId,
    }).all();

    const amountPaid = await this.sumSuccessfulAllocations(
      tx,
      managerId,
      allocations,
    );

    const transferredAmount = transfers.reduce(
      (total: Decimal, transfer: any) => total.plus(money(transfer.amount)),
      new Decimal(0),
    );

    const totalAmount = money(invoice.totalAmount);

    const balanceDue = Decimal.max(
      totalAmount.minus(amountPaid).minus(transferredAmount),
      0,
    );

    return {
      amountPaid,
      transferredAmount,
      balanceDue,
      totalAmount,
    };
  }

  private async paymentAllocatedAmount(
    tx: any,
    managerId: string,
    paymentId: string,
  ) {
    const allocations = await tx.orm.public.PaymentAllocation.where({
      managerId,
      paymentId,
    }).all();

    return allocations.reduce(
      (total: Decimal, allocation: any) => total.plus(money(allocation.amount)),
      new Decimal(0),
    );
  }

  private invoiceStatus(
    amountPaid: Decimal,
    balanceDue: Decimal,
    currentStatus: string,
  ) {
    if (currentStatus === InvoiceStatus.CANCELLED) {
      return InvoiceStatus.CANCELLED;
    }

    if (balanceDue.equals(0)) {
      return InvoiceStatus.PAID;
    }

    if (amountPaid.greaterThan(0)) {
      return InvoiceStatus.PARTIALLY_PAID;
    }

    return InvoiceStatus.ISSUED;
  }
}
