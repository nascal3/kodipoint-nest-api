import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '@/database/database.service';
import {PaymentStatus} from "@/payments/dto/create-payment.dto";

@Injectable()
export class ReceiptsService {
    constructor(
        private readonly prisma: DatabaseService,
    ) {}

    /**
     * Create one receipt for a completed payment.
     *
     * A payment can only have one receipt because
     * Payment.paymentId is unique in the contract.
     */
    async createForPayment(managerId: string, paymentId: string,) {
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

            if (payment.status !== PaymentStatus.SUCCESSFUL) {
                throw new ConflictException(
                    'A receipt can only be created for a successful payment',
                );
            }

            const existingReceipt =
                await tx.orm.public.Receipt
                    .where({
                        paymentId,
                        managerId,
                    })
                    .first();

            if (existingReceipt) {
                return this.getReceiptById(
                    managerId,
                    existingReceipt.id,
                );
            }

            const receiptNumber =
                await this.generateReceiptNumber();

            const receipt =
                await tx.orm.public.Receipt.create({
                    managerId,
                    paymentId,
                    receiptNumber,
                    issuedAt: new Date(),
                });

            return this.getReceiptById(
                managerId,
                receipt.id,
            );
        });
    }

    /**
     * Find one receipt owned by the authenticated manager.
     */
    async findOne(managerId: string, receiptId: string) {
        return this.getReceiptById(
            managerId,
            receiptId,
        );
    }

    /**
     * Find a receipt using its payment ID.
     */
    async findByPayment(managerId: string, paymentId: string) {
        const receipt =
            await this.prisma.db.orm.public.Receipt
                .where({
                    managerId,
                    paymentId,
                })
                .first();

        if (!receipt) {
            throw new NotFoundException(
                'Receipt not found for this payment',
            );
        }

        return this.getReceiptById(
            managerId,
            receipt.id,
        );
    }

    /**
     * List receipts owned by the authenticated manager.
     */
    async findAll(managerId: string) {
        const receipts =
            await this.prisma.db.orm.public.Receipt
                .where({
                    managerId,
                })
                .all();

        const results = [];

        for (const receipt of receipts) {
            results.push(
                await this.getReceiptById(
                    managerId,
                    receipt.id,
                ),
            );
        }

        return results;
    }

    /**
     * Prepare receipt data for PDF generation or delivery.
     */
    async getForDocument(managerId: string, receiptId: string) {
        const receipt = await this.getReceiptById(managerId, receiptId);

        return {
            receiptNumber: receipt.receiptNumber,
            issuedAt: receipt.issuedAt,
            notes: receipt.notes,
            payment: receipt.payment,
            invoice: receipt.invoice,
            tenant: receipt.tenant,
            property: receipt.property,
        };
    }

    /**
     * Generate a receipt number.
     *
     * For production, replace this with a database-backed
     * sequence or numbering table if strict sequential
     * numbering is required.
     */
    private async generateReceiptNumber(): Promise<string> {
        const date = new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, '');

        const random = Math.floor(
            100000 + Math.random() * 900000,
        );

        return `RCT-${date}-${random}`;
    }

    /**
     * Internal receipt lookup with related records.
     *
     * Prisma ORM 8 contract clients may not hydrate all
     * relations automatically, so each related model is
     * queried explicitly.
     */
    private async getReceiptById(managerId: string, receiptId: string,) {
        const receipt =
            await this.prisma.db.orm.public.Receipt
                .where({
                    id: receiptId,
                    managerId,
                })
                .first();

        if (!receipt) {
            throw new NotFoundException(
                'Receipt not found',
            );
        }

        const payment =
            await this.prisma.db.orm.public.Payment
                .where({
                    id: receipt.paymentId,
                    managerId,
                })
                .first();

        if (!payment) {
            throw new NotFoundException(
                'Receipt payment not found',
            );
        }

        const invoice =
            await this.prisma.db.orm.public.Invoice
                .where({
                    id: payment.invoiceId,
                    managerId,
                })
                .first();

        if (!invoice) {
            throw new NotFoundException(
                'Receipt invoice not found',
            );
        }

        const tenant =
            await this.prisma.db.orm.public.Tenant
                .where({
                    id: payment.tenantId,
                    managerId,
                })
                .first();

        if (!tenant) {
            throw new NotFoundException(
                'Receipt tenant not found',
            );
        }

        const property =
            await this.prisma.db.orm.public.Property
                .where({
                    id: payment.propertyId,
                    managerId,
                })
                .first();

        if (!property) {
            throw new NotFoundException(
                'Receipt property not found',
            );
        }

        const allocations =
            await this.prisma.db.orm.public
                .PaymentAllocation
                .where({
                    managerId,
                    paymentId: payment.id,
                })
                .all();

        return {
            ...receipt,
            payment,
            invoice,
            tenant,
            property,
            allocations,
        };
    }
}