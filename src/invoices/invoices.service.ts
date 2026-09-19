import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '@/database/database.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesDto, InvoiceStatus } from './dto/list-invoices.dto';
import { TenancyStatus } from '@/tenancies/dto/assign-tenant.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { SendInvoiceDto, InvoiceDeliveryChannel } from './dto/send-invoice.dto';
import Decimal from "decimal.js";

@Injectable()
export class InvoicesService {
    constructor(
        private readonly prisma: DatabaseService,
    ) {}

    async create(
        managerId: string,
        dto: CreateInvoiceDto,
    ) {
        const issueDate = new Date(dto.issueDate);
        const dueDate = new Date(dto.dueDate);

        if (dueDate < issueDate) {
            throw new BadRequestException(
                'Due date cannot be earlier than issue date',
            );
        }

        return this.prisma.db.transaction(async (tx) => {
            const tenancy = await tx.orm.public.Tenancy
                .where({
                    id: dto.tenancyId,
                    managerId,
                    status: TenancyStatus.ACTIVE,
                })
                .first();

            if (!tenancy) {
                throw new NotFoundException(
                    'Active tenancy not found',
                );
            }

            const property = await tx.orm.public.Property
                .where({
                    id: tenancy.propertyId,
                    managerId,
                })
                .first();

            if (!property) {
                throw new NotFoundException(
                    'Property not found',
                );
            }

            const tenant = await tx.orm.public.Tenant
                .where({
                    id: tenancy.tenantId,
                    managerId,
                })
                .first();

            if (!tenant) {
                throw new NotFoundException(
                    'Tenant not found',
                );
            }

            const charges =
                await tx.orm.public.PropertyCharge
                    .where({
                        propertyId: property.id,
                        managerId,
                        isActive: true,
                    })
                    .all();

            const invoiceItems = [
                {
                    propertyChargeId: null,
                    description: 'Monthly rent',
                    quantity: 1,
                    unitAmount: tenancy.monthlyRent,
                    totalAmount: tenancy.monthlyRent,
                },
                ...charges.map((charge) => ({
                    propertyChargeId: charge.id,
                    description: charge.name,
                    quantity: 1,
                    unitAmount: charge.amount,
                    totalAmount: charge.amount,
                })),
            ];

            const totalAmount = invoiceItems.reduce(
                (total, item) =>
                    total.plus(new Decimal(item.totalAmount)),
                new Decimal(0),
            );

            if (totalAmount.toNumber() <= 0) {
                throw new BadRequestException(
                    'Invoice total must be greater than zero',
                );
            }

            const invoice =
                await tx.orm.public.Invoice.create({
                    managerId,
                    propertyId: property.id,
                    tenancyId: tenancy.id,
                    tenantId: tenant.id,
                    invoiceNumber: await this.generateInvoiceNumber(),
                    issueDate,
                    dueDate,
                    subtotal: totalAmount.toString(),
                    totalAmount: totalAmount.toString(),
                    amountPaid: '0',
                    balanceDue: totalAmount.toString(),
                    status: InvoiceStatus.ISSUED,
                    notes: dto.notes,
                });

            for (const item of invoiceItems) {
                await tx.orm.public.InvoiceItem.create({
                    invoiceId: invoice.id,
                    propertyChargeId: item.propertyChargeId,
                    description: item.description,
                    quantity: item.quantity.toString(),
                    unitAmount: item.unitAmount,
                    totalAmount: item.totalAmount,
                });
            }

            return invoice;
        });
    }

    async findAll(
        managerId: string,
        query: ListInvoicesDto,
    ) {
        const where: Record<string, unknown> = {
            managerId,
        };

        if (query.status) {
            where.status = query.status;
        }

        if (query.propertyId) {
            where.propertyId = query.propertyId;
        }

        if (query.tenantId) {
            where.tenantId = query.tenantId;
        }

        if (query.from || query.to) {
            where.issueDate = {
                ...(query.from
                    ? { gte: new Date(query.from) }
                    : {}),
                ...(query.to
                    ? { lte: new Date(query.to) }
                    : {}),
            };
        }

        return this.prisma.db.orm.public.Invoice
            .where(where)
            .all();
    }

    async findOne(
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

        const items =
            await this.prisma.db.orm.public.InvoiceItem
                .where({
                    invoiceId: invoice.id,
                })
                .all();

        const payments =
            await this.prisma.db.orm.public.Payment
                .where({
                    invoiceId: invoice.id,
                    managerId,
                })
                .all();

        return {
            ...invoice,
            items,
            payments,
        };
    }

    async update(
        managerId: string,
        invoiceId: string,
        dto: UpdateInvoiceDto,
    ) {
        const invoice = await this.findOne(
            managerId,
            invoiceId,
        );

        if (invoice.status !== InvoiceStatus.DRAFT) {
            throw new ConflictException(
                'Only draft invoices can be edited',
            );
        }

        if (
            dto.dueDate &&
            new Date(dto.dueDate) < invoice.issueDate
        ) {
            throw new BadRequestException(
                'Due date cannot be earlier than issue date',
            );
        }

        return this.prisma.db.orm.public.Invoice
            .where({
                id: invoiceId,
                managerId,
            })
            .update({
                ...(dto.dueDate
                    ? { dueDate: new Date(dto.dueDate) }
                    : {}),
                ...(dto.notes !== undefined
                    ? { notes: dto.notes }
                    : {}),
            });
    }

    async cancel(
        managerId: string,
        invoiceId: string,
    ) {
        const invoice = await this.findOne(
            managerId,
            invoiceId,
        );

        if (invoice.status === InvoiceStatus.PAID) {
            throw new ConflictException(
                'A paid invoice cannot be cancelled',
            );
        }

        if (invoice.status === InvoiceStatus.CANCELLED) {
            return invoice;
        }

        if (Number(invoice.amountPaid) > 0) {
            throw new ConflictException(
                'An invoice with payments cannot be cancelled',
            );
        }

        return this.prisma.db.orm.public.Invoice
            .where({
                id: invoiceId,
                managerId,
            })
            .update({
                status: InvoiceStatus.CANCELLED,
            });
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
            await this.prisma.db.orm.public.Invoice
                .where(where)
                .all();

        for (const invoice of overdueInvoices) {
            await this.prisma.db.orm.public.Invoice
                .where({
                    id: invoice.id,
                    managerId: invoice.managerId,
                })
                .update({
                    status: InvoiceStatus.OVERDUE,
                });
        }

        return {
            updated: overdueInvoices.length,
        };
    }

    async getForDelivery(
        managerId: string,
        invoiceId: string,
    ) {
        const invoice = await this.findOne(
            managerId,
            invoiceId,
        );

        const tenant = await this.prisma.db.orm.public.Tenant
            .where({
                id: invoice.tenantId,
                managerId,
            })
            .first();

        const property =
            await this.prisma.db.orm.public.Property
                .where({
                    id: invoice.propertyId,
                    managerId,
                })
                .first();

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
        const invoice = await this.getForDelivery(
            managerId,
            invoiceId,
        );

        if (
            !invoice.tenant?.email &&
            dto.channels.includes(InvoiceDeliveryChannel.EMAIL)
        ) {
            throw new BadRequestException(
                'Tenant does not have an email address',
            );
        }

        if (
            !invoice.tenant?.phone &&
            dto.channels.includes(InvoiceDeliveryChannel.SMS)
        ) {
            throw new BadRequestException(
                'Tenant does not have a phone number',
            );
        }

        // Replace this return with a BullMQ enqueue call.
        return {
            message: 'Invoice delivery queued',
            invoiceId,
            channels: dto.channels,
        };
    }

    private async generateInvoiceNumber() {
        const date = new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, '');

        const random = Math.floor(
            100000 + Math.random() * 900000,
        );

        return `INV-${date}-${random}`;
    }
}