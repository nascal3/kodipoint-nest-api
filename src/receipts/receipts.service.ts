import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '@/database/database.service';
import { PaymentStatus } from '@/payments/dto/create-payment.dto';
import { generateReceiptNumber } from '@/common/utils/receipt-number.util';
import { money } from '@/common/utils/money.util';
import Decimal from 'decimal.js';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Create receipts for a completed payment.
   *
   * One receipt is produced per payment allocation so a single
   * payment covering several invoices yields one receipt per
   * invoice/period. Allocations that already have a receipt are
   * skipped, which keeps this endpoint idempotent.
   */
  async createForPayment(managerId: string, paymentId: string) {
    return this.prisma.db.transaction(async (tx) => {
      const payment = await tx.orm.public.Payment.where({
        id: paymentId,
        managerId,
      }).first();

      if (!payment) {
        this.logger.warn(
          `Receipt creation failed: paymentId=${paymentId} managerId=${managerId} not found`,
        );
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.SUCCESSFUL) {
        this.logger.warn(
          `Receipt creation rejected: paymentId=${paymentId} status=${payment.status} is not SUCCESSFUL`,
        );
        throw new ConflictException(
          'A receipt can only be created for a successful payment',
        );
      }

      const allocations = await tx.orm.public.PaymentAllocation.where({
        managerId,
        paymentId,
      }).all();

      const existingReceipts = await tx.orm.public.Receipt.where({
        managerId,
        paymentId,
      }).all();

      const receiptedAllocationIds = new Set(
        existingReceipts
          .map((receipt: any) => receipt.paymentAllocationId)
          .filter(Boolean),
      );

      if (!allocations.length) {
        if (existingReceipts.length) {
          return Promise.all(
            existingReceipts.map((receipt: any) =>
              this.getReceiptById(managerId, receipt.id),
            ),
          );
        }

        const receipt = await tx.orm.public.Receipt.create({
          managerId,
          paymentId,
          amount: payment.amount,
          receiptNumber: generateReceiptNumber(),
          issuedAt: new Date(),
        });

        return [await this.getReceiptById(managerId, receipt.id)];
      }

      const results = [];

      for (const allocation of allocations) {
        if (receiptedAllocationIds.has(allocation.id)) {
          const existing = existingReceipts.find(
            (receipt: any) => receipt.paymentAllocationId === allocation.id,
          );

          if (existing) {
            results.push(await this.getReceiptById(managerId, existing.id));
          }

          continue;
        }

        const receipt = await tx.orm.public.Receipt.create({
          managerId,
          paymentId,
          paymentAllocationId: allocation.id,
          amount: allocation.amount,
          receiptNumber: generateReceiptNumber(),
          issuedAt: new Date(),
        });

        results.push(await this.getReceiptById(managerId, receipt.id));
      }

      /*
       * Receipts without an allocation certify unallocated payment
       * balance carried forward as tenant credit.
       */
      const allocatedTotal = allocations.reduce(
        (total: Decimal, allocation: any) =>
          total.plus(money(allocation.amount)),
        new Decimal(0),
      );

      const remainder = money(payment.amount).minus(allocatedTotal);
      const remainderReceipts = existingReceipts.filter(
        (receipt: any) => !receipt.paymentAllocationId,
      );

      if (remainder.greaterThan(0) && !remainderReceipts.length) {
        const receipt = await tx.orm.public.Receipt.create({
          managerId,
          paymentId,
          amount: remainder.toFixed(2),
          receiptNumber: generateReceiptNumber(),
          issuedAt: new Date(),
          notes: 'Unallocated payment balance carried forward',
        });

        remainderReceipts.push(receipt);
      }

      for (const receipt of remainderReceipts) {
        results.push(await this.getReceiptById(managerId, receipt.id));
      }

      this.logger.log(
        `Receipts created for payment: paymentId=${paymentId} managerId=${managerId} count=${results.length}`,
      );

      return results;
    });
  }

  /**
   * Find one receipt owned by the authenticated manager.
   */
  async findOne(managerId: string, receiptId: string) {
    return this.getReceiptById(managerId, receiptId);
  }

  /**
   * Find all receipts issued for a payment.
   */
  async findByPayment(managerId: string, paymentId: string) {
    const payment = await this.prisma.db.orm.public.Payment.where({
      id: paymentId,
      managerId,
    }).first();

    if (!payment) {
      this.logger.warn(
        `Receipts lookup failed: paymentId=${paymentId} managerId=${managerId} not found`,
      );
      throw new NotFoundException('Payment not found');
    }

    const receipts = await this.prisma.db.orm.public.Receipt.where({
      managerId,
      paymentId,
    }).all();

    if (!receipts.length) {
      this.logger.warn(`No receipts found for paymentId=${paymentId}`);
      throw new NotFoundException('No receipts found for this payment');
    }

    const results = [];

    for (const receipt of receipts) {
      results.push(await this.getReceiptById(managerId, receipt.id));
    }

    return results;
  }

  /**
   * List receipts owned by the authenticated manager.
   */
  async findAll(managerId: string) {
    const receipts = await this.prisma.db.orm.public.Receipt.where({
      managerId,
    }).all();

    const results = [];

    for (const receipt of receipts) {
      results.push(await this.getReceiptById(managerId, receipt.id));
    }

    return results;
  }

  /**
   * Prepare receipt data for PDF generation or delivery.
   */
  async getForDocument(managerId: string, receiptId: string) {
    const receipt = await this.getReceiptById(managerId, receiptId);

    return {
      ...receipt,
      payment: receipt.payment,
      paymentAllocation: receipt.paymentAllocation,
      invoice: receipt.invoice,
      tenant: receipt.tenant,
      property: receipt.property,
      allocations: receipt.allocations,
    };
  }

  /**
   * Internal receipt lookup with related records.
   *
   * Prisma ORM 8 contract clients may not hydrate all
   * relations automatically, so each related model is
   * queried explicitly.
   */
  private async getReceiptById(managerId: string, receiptId: string) {
    const receipt = await this.prisma.db.orm.public.Receipt.where({
      id: receiptId,
      managerId,
    }).first();

    if (!receipt) {
      this.logger.warn(
        `Receipt lookup failed: id=${receiptId} managerId=${managerId} not found`,
      );
      throw new NotFoundException('Receipt not found');
    }

    const payment = await this.prisma.db.orm.public.Payment.where({
      id: receipt.paymentId,
      managerId,
    }).first();

    if (!payment) {
      throw new NotFoundException('Receipt payment not found');
    }

    /*
     * Receipts linked to an allocation resolve their invoice
     * through it. Legacy receipts fall back to the invoice the
     * payment was recorded against.
     */
    let invoiceId = payment.invoiceId;
    let paymentAllocation = null;

    if (receipt.paymentAllocationId) {
      paymentAllocation = await this.prisma.db.orm.public.PaymentAllocation.where(
        {
          id: receipt.paymentAllocationId,
          managerId,
        },
      ).first();

      if (paymentAllocation) {
        invoiceId = paymentAllocation.invoiceId;
      }
    }

    const invoice = await this.prisma.db.orm.public.Invoice.where({
      id: invoiceId,
      managerId,
    }).first();

    if (!invoice) {
      throw new NotFoundException('Receipt invoice not found');
    }

    const tenant = await this.prisma.db.orm.public.Tenant.where({
      id: payment.tenantId,
      managerId,
    }).first();

    if (!tenant) {
      throw new NotFoundException('Receipt tenant not found');
    }

    const property = await this.prisma.db.orm.public.Property.where({
      id: payment.propertyId,
      managerId,
    }).first();

    if (!property) {
      throw new NotFoundException('Receipt property not found');
    }

    const allocations = await this.prisma.db.orm.public.PaymentAllocation.where(
      {
        managerId,
        paymentId: payment.id,
      },
    ).all();

    return {
      ...receipt,
      payment,
      paymentAllocation,
      invoice,
      tenant,
      property,
      allocations,
    };
  }
}
