import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import Decimal from 'decimal.js';

import { DatabaseService } from '@/database/database.service';
import { money } from '@/common/utils/money.util';
import {CreatePaymentDto, PaymentStatus} from './dto/create-payment.dto';
import {InvoiceStatus} from "@/invoices/dto/list-invoices.dto";

@Injectable()
export class PaymentsService {
    constructor(
        private readonly prisma: DatabaseService,
    ) {}

    async create(managerId: string, dto: CreatePaymentDto,) {
        const paymentAmount = money(dto.amount);
        const paymentDate = new Date(dto.paymentDate);

        if (!paymentAmount.greaterThan(0)) {
            throw new BadRequestException(
                'Payment amount must be greater than zero',
            );
        }

        if (Number.isNaN(paymentDate.getTime())) {
            throw new BadRequestException(
                'Invalid payment date',
            );
        }

        return this.prisma.db.transaction(async (tx) => {
            const invoice =
                await tx.orm.public.Invoice
                    .where({
                        id: dto.invoiceId,
                        managerId,
                    })
                    .first();

            if (!invoice) {
                throw new NotFoundException(
                    'Invoice not found',
                );
            }

            if (invoice.status === InvoiceStatus.CANCELLED) {
                throw new BadRequestException(
                    'Cannot pay a cancelled invoice',
                );
            }

            const payment =
                await tx.orm.public.Payment.create({
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

            const allocation =
                await tx.orm.public.PaymentAllocation
                    .create({
                        managerId,
                        paymentId: payment.id,
                        invoiceId: invoice.id,
                        amount: paymentAmount.toFixed(2),
                        allocatedAt: new Date(),
                        notes: 'Initial payment allocation',
                    });

            const invoiceTotals =
                await this.calculateInvoiceTotals(
                    tx,
                    managerId,
                    invoice.id,
                );

            await tx.orm.public.Invoice
                .where({
                    id: invoice.id,
                    managerId,
                })
                .update({
                    amountPaid: invoiceTotals.amountPaid.toFixed(2),
                    balanceDue: invoiceTotals.balanceDue.toFixed(2),
                    status: this.invoiceStatus(
                        invoiceTotals.amountPaid,
                        invoiceTotals.balanceDue,
                        invoice.status,
                    ),
                });

            return {
                payment,
                allocation,
                invoice: {
                    id: invoice.id,
                    amountPaid: invoiceTotals.amountPaid.toFixed(2),
                    balanceDue: invoiceTotals.balanceDue.toFixed(2),
                    status: this.invoiceStatus(
                        invoiceTotals.amountPaid,
                        invoiceTotals.balanceDue,
                        invoice.status,
                    ),
                },
            };
        });
    }

    async allocateExistingPayment(
        managerId: string,
        paymentId: string,
        invoiceId: string,
        amount: string,
        notes?: string,
    ) {
        const requestedAmount = money(amount);

        if (!requestedAmount.greaterThan(0)) {
            throw new BadRequestException(
                'Allocation amount must be greater than zero',
            );
        }

        return this.prisma.db.transaction(async (tx) => {
            const payment =
                await tx.orm.public.Payment
                    .where({
                        id: paymentId,
                        managerId,
                        status: PaymentStatus.SUCCESSFUL,
                    })
                    .first();

            if (!payment) {
                throw new NotFoundException(
                    'Successful payment not found',
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

            if (invoice.status === InvoiceStatus.CANCELLED) {
                throw new BadRequestException(
                    'Cannot allocate payment to a cancelled invoice',
                );
            }

            if (
                payment.tenantId !== invoice.tenantId ||
                payment.propertyId !== invoice.propertyId
            ) {
                throw new BadRequestException(
                    'Payment and invoice must belong to the same tenant and property',
                );
            }

            const paymentAllocated =
                await this.paymentAllocatedAmount(
                    tx,
                    managerId,
                    paymentId,
                );

            const paymentRemaining = money(
                payment.amount,
            ).minus(paymentAllocated);

            if (
                requestedAmount.greaterThan(
                    paymentRemaining,
                )
            ) {
                throw new BadRequestException(
                    'Allocation exceeds unallocated payment amount',
                );
            }

            const invoiceTotals =
                await this.calculateInvoiceTotals(
                    tx,
                    managerId,
                    invoiceId,
                );

            if (
                requestedAmount.greaterThan(
                    invoiceTotals.balanceDue,
                )
            ) {
                throw new BadRequestException(
                    'Allocation exceeds invoice balance',
                );
            }

            const allocation =
                await tx.orm.public.PaymentAllocation
                    .create({
                        managerId,
                        paymentId,
                        invoiceId,
                        amount: requestedAmount.toFixed(2),
                        allocatedAt: new Date(),
                        notes,
                    });

            const updatedInvoiceTotals =
                await this.calculateInvoiceTotals(
                    tx,
                    managerId,
                    invoiceId,
                );

            await tx.orm.public.Invoice
                .where({
                    id: invoiceId,
                    managerId,
                })
                .update({
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
    }

    async reversePayment(
        managerId: string,
        paymentId: string,
    ) {
        return this.prisma.db.transaction(async (tx) => {
            const payment =
                await tx.orm.public.Payment
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

            if (payment.status === PaymentStatus.REVERSED) {
                throw new BadRequestException(
                    'Payment is already reversed',
                );
            }

            const allocations =
                await tx.orm.public.PaymentAllocation
                    .where({
                        managerId,
                        paymentId,
                    })
                    .all();

            const affectedInvoiceIds = [
                ...new Set(
                    allocations.map(
                        (allocation: any) =>
                            allocation.invoiceId,
                    ),
                ),
            ];

            await tx.orm.public.Payment
                .where({
                    id: paymentId,
                    managerId,
                })
                .update({
                    status: PaymentStatus.REVERSED,
                });

            for (const invoiceId of affectedInvoiceIds) {
                const invoice =
                    await tx.orm.public.Invoice
                        .where({
                            id: invoiceId,
                            managerId,
                        })
                        .first();

                if (!invoice) {
                    continue;
                }

                const totals =
                    await this.calculateInvoiceTotals(
                        tx,
                        managerId,
                        invoiceId,
                    );

                await tx.orm.public.Invoice
                    .where({
                        id: invoiceId,
                        managerId,
                    })
                    .update({
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
    }

    async findAll(managerId: string) {
        return this.prisma.db.orm.public.Payment
            .where({
                managerId,
            })
            .all();
    }

    async findOne(
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

        const allocations =
            await this.prisma.db.orm.public
                .PaymentAllocation
                .where({
                    managerId,
                    paymentId,
                })
                .all();

        return {
            ...payment,
            allocations,
        };
    }

    private async calculateInvoiceTotals(
        tx: any,
        managerId: string,
        invoiceId: string,
    ) {
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

        const allocations =
            await tx.orm.public.PaymentAllocation
                .where({
                    managerId,
                    invoiceId,
                })
                .all();

        const transfers =
            await tx.orm.public.InvoiceBalanceTransfer
                .where({
                    managerId,
                    sourceInvoiceId: invoiceId,
                })
                .all();

        const amountPaid = allocations
            .filter((allocation: any) => {
                return true;
            })
            .reduce(
                (total: Decimal, allocation: any) =>
                    total.plus(money(allocation.amount)),
                new Decimal(0),
            );

        const transferredAmount = transfers.reduce(
            (total: Decimal, transfer: any) =>
                total.plus(money(transfer.amount)),
            new Decimal(0),
        );

        const totalAmount = money(invoice.totalAmount);

        const balanceDue = Decimal.max(
            totalAmount
                .minus(amountPaid)
                .minus(transferredAmount),
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

    private invoiceStatus(amountPaid: Decimal, balanceDue: Decimal, currentStatus: string) {
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