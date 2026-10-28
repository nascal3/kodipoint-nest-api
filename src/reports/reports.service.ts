import { Injectable, NotFoundException } from '@nestjs/common';
import { and } from '@prisma/orm-postgres/orm-client';
import { DatabaseService } from '@/database/database.service';
import { PropertyIncomeReportDto } from './dto/property-income-report.dto';
import { PropertyInvoicesReportDto } from './dto/property-invoices-report.dto';
import { TenantInvoicesReportDto } from './dto/tenant-invoices-report.dto';
import { AllPropertiesIncomeReportDto } from './dto/all-properties-income-report.dto';
import { TotalRentOwedReportDto } from './dto/total-rent-owed-report.dto';
import { InvoiceTableReportDto } from './dto/invoice-table-report.dto';
import { ProjectedRentReportDto } from './dto/projected-rent-report.dto';
import { SortOrder } from './dto/pagination.dto';
import Decimal from 'decimal.js';
import { Temporal } from '@js-temporal/polyfill';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: DatabaseService) {}

  async getPropertyIncomeReport(
    managerId: string,
    dto: PropertyIncomeReportDto,
  ) {
    const property = await this.prisma.db.orm.public.Property.where({
      id: dto.propertyId,
      managerId,
    }).first();

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const payments = await this.prisma.db.orm.public.Payment.where((payment) =>
      and(
        payment.managerId.eq(managerId),
        payment.propertyId.eq(dto.propertyId),
        ...(dto.fromDate
          ? [
              payment.paymentDate.gte(
                Temporal.PlainDate.from(dto.fromDate.slice(0, 10)),
              ),
            ]
          : []),
        ...(dto.toDate
          ? [
              payment.paymentDate.lte(
                Temporal.PlainDate.from(dto.toDate.slice(0, 10)),
              ),
            ]
          : []),
      ),
    ).all();

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
    const property = await this.prisma.db.orm.public.Property.where({
      id: dto.propertyId,
      managerId,
    }).first();

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const invoices = await this.prisma.db.orm.public.Invoice.where({
      managerId,
      propertyId: dto.propertyId,
    }).all();

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
    const tenant = await this.prisma.db.orm.public.Tenant.where({
      id: dto.tenantId,
      managerId,
    }).first();

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const invoices = await this.prisma.db.orm.public.Invoice.where({
      managerId,
      tenantId: dto.tenantId,
    }).all();

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
    const payments = await this.prisma.db.orm.public.Payment.where((payment) =>
      and(
        payment.managerId.eq(managerId),
        ...(dto.fromDate
          ? [
              payment.paymentDate.gte(
                Temporal.PlainDate.from(dto.fromDate.slice(0, 10)),
              ),
            ]
          : []),
        ...(dto.toDate
          ? [
              payment.paymentDate.lte(
                Temporal.PlainDate.from(dto.toDate.slice(0, 10)),
              ),
            ]
          : []),
      ),
    ).all();

    const totalIncome = payments.reduce(
      (sum, payment) => sum.plus(new Decimal(String(payment.amount))),
      new Decimal(0),
    );

    const incomeByProperty = new Map<string, Decimal>();

    for (const payment of payments) {
      const current =
        incomeByProperty.get(payment.propertyId) || new Decimal(0);
      incomeByProperty.set(
        payment.propertyId,
        current.plus(new Decimal(String(payment.amount))),
      );
    }

    const propertyIds = Array.from(incomeByProperty.keys());
    const properties = await this.prisma.db.orm.public.Property.where((p) =>
      p.id.in(propertyIds),
    ).all();

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

    const incomeByMonth = new Map<string, Decimal>();
    for (const payment of payments) {
      const monthKey = `${payment.paymentDate.year}-${String(payment.paymentDate.month).padStart(2, '0')}`;
      const current = incomeByMonth.get(monthKey) || new Decimal(0);
      incomeByMonth.set(
        monthKey,
        current.plus(new Decimal(String(payment.amount))),
      );
    }

    const monthlyTotals = this.generateMonthlyTotals(
      incomeByMonth,
      dto.fromDate,
      dto.toDate,
    );

    return {
      summary: {
        totalIncome: totalIncome.toFixed(2),
        totalPayments: payments.length,
        totalProperties: properties.length,
      },
      monthlyTotals,
      properties: paginatedData.data,
      pagination: paginatedData.pagination,
    };
  }

  async getTotalRentOwedReport(managerId: string, dto: TotalRentOwedReportDto) {
    const invoices = await this.prisma.db.orm.public.Invoice.where((i) =>
      and(
        i.managerId.eq(managerId),
        i.status.in(['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']),
        ...(dto.fromDate
          ? [
              i.issueDate.gte(
                Temporal.PlainDate.from(dto.fromDate.slice(0, 10)),
              ),
            ]
          : []),
        ...(dto.toDate
          ? [i.issueDate.lte(Temporal.PlainDate.from(dto.toDate.slice(0, 10)))]
          : []),
      ),
    ).all();

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
    const properties = await this.prisma.db.orm.public.Property.where((p) =>
      p.id.in(propertyIds),
    ).all();

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

    const owedByMonth = new Map<string, Decimal>();
    for (const invoice of invoices) {
      const monthKey = `${invoice.issueDate.year}-${String(invoice.issueDate.month).padStart(2, '0')}`;
      const current = owedByMonth.get(monthKey) || new Decimal(0);
      owedByMonth.set(
        monthKey,
        current.plus(new Decimal(String(invoice.balanceDue))),
      );
    }

    const monthlyTotals = this.generateMonthlyTotals(
      owedByMonth,
      dto.fromDate,
      dto.toDate,
    );

    return {
      summary: {
        totalOwed: totalOwed.toFixed(2),
        totalOutstandingInvoices: invoices.length,
        totalProperties: properties.length,
      },
      monthlyTotals,
      properties: paginatedData.data,
      pagination: paginatedData.pagination,
    };
  }

  async getInvoiceTableReport(managerId: string, dto: InvoiceTableReportDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const offset = (page - 1) * limit;

    const [invoices, totalResult] = await Promise.all([
      this.prisma.db.orm.public.Invoice.where((invoice) =>
        and(
          invoice.managerId.eq(managerId),
          ...(dto.status ? [invoice.status.eq(dto.status)] : []),
          ...(dto.fromDate
            ? [invoice.issueDate.gte(Temporal.PlainDate.from(dto.fromDate))]
            : []),
          ...(dto.toDate
            ? [invoice.issueDate.lte(Temporal.PlainDate.from(dto.toDate))]
            : []),
        ),
      )
        .orderBy((invoice) => invoice.issueDate.desc())
        .offset(offset)
        .limit(limit)
        .all(),
      this.prisma.db.orm.public.Invoice.where((invoice) =>
        and(
          invoice.managerId.eq(managerId),
          ...(dto.status ? [invoice.status.eq(dto.status)] : []),
          ...(dto.fromDate
            ? [invoice.issueDate.gte(Temporal.PlainDate.from(dto.fromDate))]
            : []),
          ...(dto.toDate
            ? [invoice.issueDate.lte(Temporal.PlainDate.from(dto.toDate))]
            : []),
        ),
      ).aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);

    const invoiceIds = invoices.map((invoice) => invoice.id);
    const tenantIds = [...new Set(invoices.map((invoice) => invoice.tenantId))];
    const propertyIds = [
      ...new Set(invoices.map((invoice) => invoice.propertyId)),
    ];
    const tenancyIds = [
      ...new Set(invoices.map((invoice) => invoice.tenancyId)),
    ];

    const [tenants, properties, tenancies, allocations, directPayments] =
      invoiceIds.length
        ? await Promise.all([
            this.prisma.db.orm.public.Tenant.where((tenant) =>
              and(tenant.managerId.eq(managerId), tenant.id.in(tenantIds)),
            ).all(),
            this.prisma.db.orm.public.Property.where((property) =>
              and(
                property.managerId.eq(managerId),
                property.id.in(propertyIds),
              ),
            ).all(),
            this.prisma.db.orm.public.Tenancy.where((tenancy) =>
              and(tenancy.managerId.eq(managerId), tenancy.id.in(tenancyIds)),
            ).all(),
            this.prisma.db.orm.public.PaymentAllocation.where((allocation) =>
              and(
                allocation.managerId.eq(managerId),
                allocation.invoiceId.in(invoiceIds),
              ),
            ).all(),
            this.prisma.db.orm.public.Payment.where((payment) =>
              and(
                payment.managerId.eq(managerId),
                payment.invoiceId.in(invoiceIds),
              ),
            ).all(),
          ])
        : [[], [], [], [], []];

    const allocatedPaymentIds = [
      ...new Set(allocations.map((item) => item.paymentId)),
    ];
    const allocatedPayments = allocatedPaymentIds.length
      ? await this.prisma.db.orm.public.Payment.where((payment) =>
          and(
            payment.managerId.eq(managerId),
            payment.id.in(allocatedPaymentIds),
          ),
        ).all()
      : [];

    const tenantsById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
    const propertiesById = new Map(
      properties.map((property) => [property.id, property]),
    );
    const tenanciesById = new Map(
      tenancies.map((tenancy) => [tenancy.id, tenancy]),
    );
    const paymentsByInvoice = new Map<string, typeof directPayments>();
    const allocationInvoiceIdsByPayment = new Map<string, string[]>();
    for (const allocation of allocations) {
      const relatedInvoiceIds =
        allocationInvoiceIdsByPayment.get(allocation.paymentId) ?? [];
      relatedInvoiceIds.push(allocation.invoiceId);
      allocationInvoiceIdsByPayment.set(
        allocation.paymentId,
        relatedInvoiceIds,
      );
    }
    for (const payment of [...directPayments, ...allocatedPayments]) {
      const relatedInvoiceIds = [
        ...(allocationInvoiceIdsByPayment.get(payment.id) ?? []),
        ...(invoiceIds.includes(payment.invoiceId) ? [payment.invoiceId] : []),
      ];
      for (const invoiceId of relatedInvoiceIds) {
        const invoicePayments = paymentsByInvoice.get(invoiceId) ?? [];
        if (!invoicePayments.some((item) => item.id === payment.id)) {
          invoicePayments.push(payment);
        }
        paymentsByInvoice.set(invoiceId, invoicePayments);
      }
    }

    const data = invoices.map((invoice) => {
      const tenant = tenantsById.get(invoice.tenantId);
      const property = propertiesById.get(invoice.propertyId);
      const tenancy = tenanciesById.get(invoice.tenancyId);
      const payments = (paymentsByInvoice.get(invoice.id) ?? []).sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
      );
      const latestPayment = payments[0];
      const amountPaid = new Decimal(String(invoice.amountPaid));
      const balanceDue = new Decimal(String(invoice.balanceDue));

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        tenant: {
          id: invoice.tenantId,
          name: tenant ? `${tenant.firstName} ${tenant.lastName}` : null,
        },
        property: {
          unit: tenancy?.propertyUnit ?? null,
          name: property?.name ?? null,
          currency: property?.currency ?? null,
        },
        totalAmount: new Decimal(String(invoice.totalAmount)).toFixed(2),
        amountPaid: amountPaid.toFixed(2),
        balanceDue: balanceDue.toFixed(2),
        status: invoice.status,
        paymentStatus: balanceDue.isZero()
          ? 'PAID'
          : amountPaid.greaterThan(0)
            ? 'PARTIALLY_PAID'
            : 'UNPAID',
        payment: latestPayment
          ? {
              method: latestPayment.paymentMethod,
              reference: latestPayment.referenceNumber,
              status: latestPayment.status,
            }
          : null,
        dateTime: latestPayment?.createdAt ?? invoice.createdAt,
      };
    });
    const total = Number(totalResult.total);
    const totalPages = Math.ceil(total / limit);

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

  async getProjectedRentReport(
    managerId: string,
    dto: ProjectedRentReportDto,
  ) {
    const tenancies = await this.prisma.db.orm.public.Tenancy.where((tenancy) =>
      and(
        tenancy.managerId.eq(managerId),
        tenancy.status.eq('ACTIVE'),
        ...(dto.propertyId ? [tenancy.propertyId.eq(dto.propertyId)] : []),
      ),
    ).all();

    const totalProjectedRent = tenancies.reduce(
      (sum, tenancy) => sum.plus(new Decimal(String(tenancy.monthlyRent))),
      new Decimal(0),
    );

    const rentByProperty = new Map<string, Decimal>();
    const unitsByProperty = new Map<string, number>();

    for (const tenancy of tenancies) {
      const currentRent =
        rentByProperty.get(tenancy.propertyId) || new Decimal(0);
      rentByProperty.set(
        tenancy.propertyId,
        currentRent.plus(new Decimal(String(tenancy.monthlyRent))),
      );

      const currentUnits = unitsByProperty.get(tenancy.propertyId) || 0;
      unitsByProperty.set(tenancy.propertyId, currentUnits + 1);
    }

    const propertyIds = Array.from(rentByProperty.keys());
    const properties = await this.prisma.db.orm.public.Property.where((p) =>
      p.id.in(propertyIds),
    ).all();

    const propertyData = properties.map((property) => ({
      property: {
        id: property.id,
        name: property.name,
        address: `${property.addressLine1}, ${property.city}`,
      },
      occupiedUnits: unitsByProperty.get(property.id) || 0,
      projectedRent: rentByProperty.get(property.id)?.toFixed(2) || '0.00',
      currency: property.currency,
    }));

    const sortedData = this.sortResults(
      propertyData,
      dto.sortBy || 'projectedRent',
      dto.sortOrder || SortOrder.DESC,
    );

    const paginatedData = this.paginateResults(
      sortedData,
      dto.page || 1,
      dto.limit || 10,
    );

    return {
      summary: {
        totalProjectedRent: totalProjectedRent.toFixed(2),
        totalOccupiedUnits: tenancies.length,
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

  private generateMonthlyTotals(
    dataByMonth: Map<string, Decimal>,
    fromDate?: string,
    toDate?: string,
  ): Array<{ month: string; total: string }> {
    if (!fromDate || !toDate) {
      return Array.from(dataByMonth.entries())
        .map(([month, total]) => ({
          month,
          total: total.toFixed(2),
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }

    const start = Temporal.PlainDate.from(fromDate.slice(0, 10));
    const end = Temporal.PlainDate.from(toDate.slice(0, 10));
    const monthlyTotals: Array<{ month: string; total: string }> = [];

    let current = Temporal.PlainDate.from({
      year: start.year,
      month: start.month,
      day: 1,
    });

    const endDate = Temporal.PlainDate.from({
      year: end.year,
      month: end.month,
      day: 1,
    });

    while (Temporal.PlainDate.compare(current, endDate) <= 0) {
      const monthKey = `${current.year}-${String(current.month).padStart(2, '0')}`;
      const total = dataByMonth.get(monthKey) || new Decimal(0);
      monthlyTotals.push({
        month: monthKey,
        total: total.toFixed(2),
      });

      current = current.add({ months: 1 });
    }

    return monthlyTotals;
  }
}
