import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import Decimal from 'decimal.js';

import { DatabaseService } from '@/database/database.service';
import { money } from '@/common/utils/money.util';

@Injectable()
export class PaymentAllocationsService {
    constructor(
        private readonly prisma: DatabaseService,
    ) {}

    async findByPayment(
        managerId: string,
        paymentId: string,
    ) {
        const payment =
            await this.prisma.db.orm.public.Payment
                .where({
                    id: paymentId,
                    managerId,
                })
                .first();

        if (!payment) {
            throw new NotFoundException(
                'Payment not found',
            );
        }

        return this.prisma.db.orm.public
            .PaymentAllocation
            .where({
                managerId,
                paymentId,
            })
            .all();
    }

    async findByInvoice(
        managerId: string,
        invoiceId: string,
    ) {
        const invoice =
            await this.prisma.db.orm.public.Invoice
                .where({
                    id: invoiceId,
                    managerId,
                })
                .first();

        if (!invoice) {
            throw new NotFoundException(
                'Invoice not found',
            );
        }

        return this.prisma.db.orm.public.PaymentAllocation
            .where({
                managerId,
                invoiceId,
            })
            .all();
    }

    async getPaymentAllocatedAmount(
        tx: any,
        managerId: string,
        paymentId: string,
    ): Promise<Decimal> {
        const allocations =
            await tx.orm.public.PaymentAllocation
                .where({
                    managerId,
                    paymentId,
                })
                .all();

        return allocations.reduce(
            (total: Decimal, allocation: any) =>
                total.plus(money(allocation.amount)),
            new Decimal(0),
        );
    }

    async getInvoiceAllocatedAmount(
        tx: any,
        managerId: string,
        invoiceId: string,
    ): Promise<Decimal> {
        const allocations =
            await tx.orm.public.PaymentAllocation
                .where({
                    managerId,
                    invoiceId,
                })
                .all();

        return allocations.reduce(
            (total: Decimal, allocation: any) =>
                total.plus(money(allocation.amount)),
            new Decimal(0),
        );
    }

    async getInvoiceTransferredAmount(
        tx: any,
        managerId: string,
        invoiceId: string,
    ): Promise<Decimal> {
        const transfers =
            await tx.orm.public.InvoiceBalanceTransfer
                .where({
                    managerId,
                    sourceInvoiceId: invoiceId,
                })
                .all();

        return transfers.reduce(
            (total: Decimal, transfer: any) =>
                total.plus(money(transfer.amount)),
            new Decimal(0),
        );
    }

    async getInvoiceOutstandingAmount(
        tx: any,
        managerId: string,
        invoiceId: string,
    ): Promise<Decimal> {
        const invoice =
            await tx.orm.public.Invoice
                .where({
                    id: invoiceId,
                    managerId,
                })
                .first();

        if (!invoice) {
            throw new NotFoundException(
                'Invoice not found',
            );
        }

        const allocatedPayments =
            await this.getInvoiceAllocatedAmount(
                tx,
                managerId,
                invoiceId,
            );

        const transferredAmount =
            await this.getInvoiceTransferredAmount(
                tx,
                managerId,
                invoiceId,
            );

        return money(invoice.totalAmount)
            .minus(allocatedPayments)
            .minus(transferredAmount);
    }

    async validatePaymentAllocation(
        tx: any,
        managerId: string,
        paymentId: string,
        invoiceId: string,
        requestedAmount: Decimal,
    ) {
        if (!requestedAmount.greaterThan(0)) {
            throw new BadRequestException(
                'Allocation amount must be greater than zero',
            );
        }

        const payment =
            await tx.orm.public.Payment
                .where({
                    id: paymentId,
                    managerId,
                    status: 'COMPLETED',
                })
                .first();

        if (!payment) {
            throw new NotFoundException(
                'Completed payment not found',
            );
        }

        const invoice =
            await tx.orm.public.Invoice
                .where({
                    id: invoiceId,
                    managerId,
                })
                .first();

        if (!invoice) {
            throw new NotFoundException(
                'Invoice not found',
            );
        }

        if (invoice.status === 'CANCELLED') {
            throw new BadRequestException(
                'Cannot allocate payment to a cancelled invoice',
            );
        }

        if (
            payment.tenantId !== invoice.tenantId ||
            payment.propertyId !== invoice.propertyId
        ) {
            throw new BadRequestException(
                'Payment and invoice do not belong to the same tenant and property',
            );
        }

        const allocatedPaymentAmount =
            await this.getPaymentAllocatedAmount(
                tx,
                managerId,
                paymentId,
            );

        const paymentAmount = money(payment.amount);
        const paymentRemaining =
            paymentAmount.minus(
                allocatedPaymentAmount,
            );

        if (
            requestedAmount.greaterThan(paymentRemaining)
        ) {
            throw new BadRequestException(
                `Allocation exceeds the unallocated payment amount of ${paymentRemaining.toFixed(2)}`,
            );
        }

        const invoiceOutstanding =
            await this.getInvoiceOutstandingAmount(
                tx,
                managerId,
                invoiceId,
            );

        if (
            requestedAmount.greaterThan(
                invoiceOutstanding,
            )
        ) {
            throw new BadRequestException(
                `Allocation exceeds the invoice outstanding amount of ${invoiceOutstanding.toFixed(2)}`,
            );
        }

        return {
            payment,
            invoice,
            paymentRemaining,
            invoiceOutstanding,
        };
    }
}