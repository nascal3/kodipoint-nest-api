import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '@/database/database.service';
import { AssignTenantDto, TenancyStatus } from './dto/assign-tenant.dto';
import { ListTenanciesDto } from './dto/list-tenancies.dto';
import { TenantStatus } from '@/tenants/dto/create-tenant.dto';
import { Temporal } from '@js-temporal/polyfill';
import {PropertyUnitStatus} from "@/properties/dto/create-property-unit.dto";

export interface TenancyListResponse {
  data: object[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

@Injectable()
export class TenanciesService {
  constructor(private readonly prisma: DatabaseService) {}

  async findAll(
    managerId: string,
    query: ListTenanciesDto,
  ): Promise<TenancyListResponse> {
    const { status, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    let tenancies = this.prisma.db.orm.public.Tenancy.where({ managerId });

    if (status) {
      tenancies = tenancies.where({ status });
    }

    const [data, total] = await Promise.all([
      tenancies
        .orderBy((tenancy) => tenancy.createdAt.desc())
        .offset(offset)
        .limit(limit)
        .all(),
      tenancies.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
    ]);

    const totalCount = Number(total.total);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(managerId: string, tenancyId: string) {
    const tenancy = await this.prisma.db.orm.public.Tenancy.where({
      id: tenancyId,
      managerId,
    }).first();

    if (!tenancy) {
      throw new NotFoundException('Tenancy not found');
    }

    return tenancy;
  }

  async assign(managerId: string, dto: AssignTenantDto) {
    const property = await this.prisma.db.orm.public.Property.where({
      id: dto.propertyId,
      managerId,
    }).first();

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.status !== 'ACTIVE') {
      throw new ConflictException(
        'Tenant can only be assigned to a property with ACTIVE status',
      );
    }

    const propertyUnit = await this.prisma.db.orm.public.PropertyUnit.where({
      propertyId: dto.propertyId,
      unitNumber: dto.propertyUnit,
      managerId,
    }).first();

    if (!propertyUnit) {
      throw new NotFoundException('Property unit not found');
    }

    if (propertyUnit.status !== 'AVAILABLE') {
      throw new ConflictException(
        'Tenant can only be assigned to a unit with AVAILABLE status',
      );
    }

    const tenant = await this.prisma.db.orm.public.Tenant.where({
      id: dto.tenantId,
      managerId,
    }).first();

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const existing = await this.prisma.db.orm.public.Tenancy.where({
      managerId,
      propertyId: dto.propertyId,
      tenantId: dto.tenantId,
      status: TenancyStatus.ACTIVE,
    }).first();

    if (existing) {
      throw new ConflictException(
        'Tenant is already assigned to this property',
      );
    }

    return this.prisma.db.transaction(async (tx) => {
      const tenancy = await tx.orm.public.Tenancy.create({
        managerId,
        propertyId: dto.propertyId,
        propertyUnit: dto.propertyUnit,
        tenantId: dto.tenantId,
        startDate: Temporal.PlainDate.from(dto.startDate.slice(0, 10)),
        status: dto.status,
        notes: dto.notes,
        assignedAt: Temporal.Now.instant(),
      });

      await tx.orm.public.PropertyUnit.where({
        id: propertyUnit.id,
        managerId,
      }).update({
        status: PropertyUnitStatus.OCCUPIED,
      });

      return tenancy;
    });
  }

  async updateNotes(managerId: string, tenancyId: string, notes?: string) {
    const tenancy = await this.prisma.db.orm.public.Tenancy.where({
      id: tenancyId,
      managerId,
    }).first();

    if (!tenancy) {
      throw new NotFoundException('Tenancy not found');
    }

    return this.prisma.db.orm.public.Tenancy.where({
      id: tenancyId,
      managerId,
    }).update({
      notes,
    });
  }

  async unassign(managerId: string, tenancyId: string, endDate: string) {
    const tenancy = await this.prisma.db.orm.public.Tenancy.where({
      id: tenancyId,
      managerId,
      status: TenancyStatus.ACTIVE,
    }).first();

    if (!tenancy) {
      throw new NotFoundException('Active tenancy not found');
    }

    const endDateValue = new Date(endDate);
    const status = endDateValue > new Date()
      ? TenancyStatus.NOTICE : TenancyStatus.ENDED;

    const tenantStatus = status === TenancyStatus.NOTICE
      ? TenantStatus.NOTICE
      : TenantStatus.ENDED;

    await this.prisma.db.orm.public.Tenancy.where({
      id: tenancyId,
      managerId,
    }).update({
      status,
      endDate: Temporal.PlainDate.from(endDate.slice(0, 10)),
      unassignedAt: Temporal.Now.instant(),
    });

    await this.prisma.db.orm.public.Tenant.where({
      id: tenancy.tenantId,
      managerId,
    }).update({
      status: tenantStatus,
    });

    return tenancy;
  }
}
