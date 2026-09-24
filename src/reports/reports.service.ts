import { Injectable, NotFoundException } from '@nestjs/common';
import { and } from '@prisma/orm-postgres/orm-client';
import { DatabaseService } from '@/database/database.service';
import { PropertyIncomeReportDto } from './dto/property-income-report.dto';
import { PropertyInvoicesReportDto } from './dto/property-invoices-report.dto';
import { TenantInvoicesReportDto } from './dto/tenant-invoices-report.dto';
import { AllPropertiesIncomeReportDto } from './dto/all-properties-income-report.dto';
import { TotalRentOwedReportDto } from './dto/total-rent-owed-report.dto';
import { SortOrder } from './dto/pagination.dto';
import Decimal from 'decimal.js';

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: DatabaseService) {}

    async getPropertyIncomeReport(
        managerId: string,
        dto: PropertyIncomeReportDto,
    ) {
        const property = await this.prisma.db.orm.public.Property
            .where({ id: dto.propertyId, managerId })
            .first();

        if (!property) {
            throw new NotFoundException('Property not found');
        }

        const where: Record<string, unknown> = {
            managerId,
            propertyId: dto.propertyId,
        };

        if (dto.fromDate || dto.toDate) {
            where.paymentDate = {
                ...(dto.fromDate ? { gte: new Date(dto.fromDate) } : {}),
                ...(dto.toDate ? { lte: new Date(dto.toDate) } : {}),
            };
        }

        const payments = await this.prisma.db.orm.public.Payment
            .where(where)
            .all();

        const totalIncome = payments.reduce(
            (sum, payment) => sum.plus(new Decimal(String(payment.amount))),
            new Decimal(0),
        );

        const sortedPayments = this.sortResults(
            payments,
            dto.sortBy || 'paymentDate',
            dto.sortOrder || SortOrder.DESC,
        );

        const paginatedPayments = this.paginateResults(
            sortedPayments,
            dto.page || 1,
            dto.limit || 10,
        );

        return {
            property: {
                id: property.id,
                name: property.name,
                address: `${property.addressLine1}, ${property.city}`,
            },
            summary: {
                totalIncome: totalIncome.toFixed(2),
                totalPayments: payments.length,
                currency: property.currency,
            },
            payments: paginatedPayments.data,
            pagination: paginatedPayments.pagination,
        };
    }

    async getPropertyInvoicesReport(
        managerId: string,
        dto: PropertyInvoicesReportDto,
    ) {
        const property = await this.prisma.db.orm.public.Property
            .where({ id: dto.propertyId, managerId })
            .first();

        if (!property) {
            throw new NotFoundException('Property not found');
        }

        const invoices = await this.prisma.db.orm.public.Invoice
            .where({ managerId, propertyId: dto.propertyId })
            .all();

        const totalIssued = invoices.reduce(
            (sum, invoice) => sum.plus(new Decimal(String(invoice.totalAmount))),
            new Decimal(0),
        );

        const totalPaid = invoices.reduce(
            (sum, invoice) => sum.plus(new Decimal(String(invoice.amountPaid))),
            new Decimal(0),
        );

        const totalOutstanding = totalIssued.minus(totalPaid);

        const sortedInvoices = this.sortResults(
            invoices,
            dto.sortBy || 'issueDate',
            dto.sortOrder || SortOrder.DESC,
        );

        const paginatedInvoices = this.paginateResults(
            sortedInvoices,
            dto.page || 1,
            dto.limit || 10,
        );

        return {
            property: {
                id: property.id,
                name: property.name,
                address: `${property.addressLine1}, ${property.city}`,
            },
            summary: {
                totalIssued: totalIssued.toFixed(2),
                totalPaid: totalPaid.toFixed(2),
                totalOutstanding: totalOutstanding.toFixed(2),
                totalInvoices: invoices.length,
                currency: property.currency,
            },
            invoices: paginatedInvoices.data,
            pagination: paginatedInvoices.pagination,
        };
    }

    async getTenantInvoicesReport(
        managerId: string,
        dto: TenantInvoicesReportDto,
    ) {
        const tenant = await this.prisma.db.orm.public.Tenant
            .where({ id: dto.tenantId, managerId })
            .first();

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        const invoices = await this.prisma.db.orm.public.Invoice
            .where({ managerId, tenantId: dto.tenantId })
            .all();

        const totalIssued = invoices.reduce(
            (sum, invoice) => sum.plus(new Decimal(String(invoice.totalAmount))),
            new Decimal(0),
        );

        const totalPaid = invoices.reduce(
            (sum, invoice) => sum.plus(new Decimal(String(invoice.amountPaid))),
            new Decimal(0),
        );

        const totalOutstanding = totalIssued.minus(totalPaid);

        const sortedInvoices = this.sortResults(
            invoices,
            dto.sortBy || 'issueDate',
            dto.sortOrder || SortOrder.DESC,
        );

        const paginatedInvoices = this.paginateResults(
            sortedInvoices,
            dto.page || 1,
            dto.limit || 10,
        );

        return {
            tenant: {
                id: tenant.id,
                firstName: tenant.firstName,
                lastName: tenant.lastName,
                email: tenant.email,
            },
            summary: {
                totalIssued: totalIssued.toFixed(2),
                totalPaid: totalPaid.toFixed(2),
                totalOutstanding: totalOutstanding.toFixed(2),
                totalInvoices: invoices.length,
            },
            invoices: paginatedInvoices.data,
            pagination: paginatedInvoices.pagination,
        };
    }

    async getAllPropertiesIncomeReport(
        managerId: string,
        dto: AllPropertiesIncomeReportDto,
    ) {
        const where: Record<string, unknown> = {
            managerId,
        };

        if (dto.fromDate || dto.toDate) {
            where.paymentDate = {
                ...(dto.fromDate ? { gte: new Date(dto.fromDate) } : {}),
                ...(dto.toDate ? { lte: new Date(dto.toDate) } : {}),
            };
        }

        const payments = await this.prisma.db.orm.public.Payment
            .where(where)
            .all();

        const totalIncome = payments.reduce(
            (sum, payment) => sum.plus(new Decimal(String(payment.amount))),
            new Decimal(0),
        );

        const incomeByProperty = new Map<string, Decimal>();

        for (const payment of payments) {
            const current = incomeByProperty.get(payment.propertyId) || new Decimal(0);
            incomeByProperty.set(
                payment.propertyId,
                current.plus(new Decimal(String(payment.amount))),
            );
        }

        const propertyIds = Array.from(incomeByProperty.keys());
        const properties = await this.prisma.db.orm.public.Property
            .where((p) => p.id.in(propertyIds))
            .all();

        const propertyIncomeData = properties.map((property) => ({
            property: {
                id: property.id,
                name: property.name,
                address: `${property.addressLine1}, ${property.city}`,
            },
            income: incomeByProperty.get(property.id)?.toFixed(2) || '0.00',
            currency: property.currency,
        }));

        const sortedData = this.sortResults(
            propertyIncomeData,
            dto.sortBy || 'income',
            dto.sortOrder || SortOrder.DESC,
        );

        const paginatedData = this.paginateResults(
            sortedData,
            dto.page || 1,
            dto.limit || 10,
        );

        return {
            summary: {
                totalIncome: totalIncome.toFixed(2),
                totalPayments: payments.length,
                totalProperties: properties.length,
            },
            properties: paginatedData.data,
            pagination: paginatedData.pagination,
        };
    }

    async getTotalRentOwedReport(
        managerId: string,
        dto: TotalRentOwedReportDto,
    ) {
        const where: Record<string, unknown> = {
            managerId,
        };

        const invoices = await this.prisma.db.orm.public.Invoice
            .where((i) =>
                and(
                    i.managerId.eq(managerId),
                    i.status.in(['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']),
                    ...(dto.fromDate ? [i.issueDate.gte(new Date(dto.fromDate))] : []),
                    ...(dto.toDate ? [i.issueDate.lte(new Date(dto.toDate))] : []),
                ),
            )
            .all();

        const totalOwed = invoices.reduce(
            (sum, invoice) => sum.plus(new Decimal(String(invoice.balanceDue))),
            new Decimal(0),
        );

        const owedByProperty = new Map<string, Decimal>();

        for (const invoice of invoices) {
            const current = owedByProperty.get(invoice.propertyId) || new Decimal(0);
            owedByProperty.set(
                invoice.propertyId,
                current.plus(new Decimal(String(invoice.balanceDue))),
            );
        }

        const propertyIds = Array.from(owedByProperty.keys());
        const properties = await this.prisma.db.orm.public.Property
            .where((p) => p.id.in(propertyIds))
            .all();

        const propertyOwedData = properties.map((property) => ({
            property: {
                id: property.id,
                name: property.name,
                address: `${property.addressLine1}, ${property.city}`,
            },
            amountOwed: owedByProperty.get(property.id)?.toFixed(2) || '0.00',
            currency: property.currency,
        }));

        const sortedData = this.sortResults(
            propertyOwedData,
            dto.sortBy || 'amountOwed',
            dto.sortOrder || SortOrder.DESC,
        );

        const paginatedData = this.paginateResults(
            sortedData,
            dto.page || 1,
            dto.limit || 10,
        );

        return {
            summary: {
                totalOwed: totalOwed.toFixed(2),
                totalOutstandingInvoices: invoices.length,
                totalProperties: properties.length,
            },
            properties: paginatedData.data,
            pagination: paginatedData.pagination,
        };
    }

    private sortResults<T>(
        results: T[],
        sortBy: string,
        sortOrder: SortOrder,
    ): T[] {
        const sorted = [...results].sort((a, b) => {
            const aValue = this.getNestedValue(a, sortBy);
            const bValue = this.getNestedValue(b, sortBy);

            if (aValue === bValue) return 0;

            const comparison = aValue < bValue ? -1 : 1;
            return sortOrder === SortOrder.ASC ? comparison : -comparison;
        });

        return sorted;
    }

    private paginateResults<T>(
        results: T[],
        page: number,
        limit: number,
    ): { data: T[]; pagination: any } {
        const total = results.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const data = results.slice(offset, offset + limit);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
}
