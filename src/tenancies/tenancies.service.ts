import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '@/database/database.service';
import { AssignTenantDto, TenancyStatus } from './dto/assign-tenant.dto';
import { ListTenanciesDto } from './dto/list-tenancies.dto';
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
  private readonly logger = new Logger(TenanciesService.name);

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
      this.logger.warn(
        `Tenancy lookup failed: id=${tenancyId} managerId=${managerId} not found`,
      );
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
      this.logger.warn(
        `Tenancy assign failed: propertyId=${dto.propertyId} managerId=${managerId} not found`,
      );
      throw new NotFoundException('Property not found');
    }

    if (property.status !== 'ACTIVE') {
      this.logger.warn(
        `Tenancy assign rejected: propertyId=${dto.propertyId} status=${property.status} is not ACTIVE`,
      );
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
      this.logger.warn(
        `Tenancy assign failed: propertyId=${dto.propertyId} unit=${dto.propertyUnit} not found`,
      );
      throw new NotFoundException('Property unit not found');
    }

    if (propertyUnit.status !== 'AVAILABLE') {
      this.logger.warn(
        `Tenancy assign rejected: unitId=${propertyUnit.id} status=${propertyUnit.status} is not AVAILABLE`,
      );
      throw new ConflictException(
        'Tenant can only be assigned to a unit with AVAILABLE status',
      );
    }

    const tenant = await this.prisma.db.orm.public.Tenant.where({
      id: dto.tenantId,
      managerId,
    }).first();

    if (!tenant) {
      this.logger.warn(
        `Tenancy assign failed: tenantId=${dto.tenantId} managerId=${managerId} not found`,
      );
      throw new NotFoundException('Tenant not found');
    }

    const existing = await this.prisma.db.orm.public.Tenancy.where({
      managerId,
      propertyId: dto.propertyId,
      propertyUnitId: propertyUnit.id,
      tenantId: dto.tenantId,
      status: TenancyStatus.ACTIVE,
    }).first();

    if (existing) {
      this.logger.warn(
        `Tenancy assign rejected: tenantId=${dto.tenantId} already assigned to unitId=${propertyUnit.id}`,
      );
      throw new ConflictException(
        'Tenant is already assigned to this property unit',
      );
    }

    const tenancy = await this.prisma.db.transaction(async (tx) => {
      const tenancy = await tx.orm.public.Tenancy.create({
        managerId,
        propertyId: dto.propertyId,
        propertyUnit: dto.propertyUnit,
        propertyUnitId: propertyUnit.id,
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

    this.logger.log(
      `Tenancy assigned: id=${tenancy.id} tenantId=${dto.tenantId} propertyId=${dto.propertyId} unitId=${propertyUnit.id} managerId=${managerId}`,
    );

    return tenancy;
  }

  async updateNotes(managerId: string, tenancyId: string, notes?: string) {
    const tenancy = await this.prisma.db.orm.public.Tenancy.where({
      id: tenancyId,
      managerId,
    }).first();

    if (!tenancy) {
      this.logger.warn(
        `Tenancy update rejected: id=${tenancyId} managerId=${managerId} not found`,
      );
      throw new NotFoundException('Tenancy not found');
    }

    const updated = await this.prisma.db.orm.public.Tenancy.where({
      id: tenancyId,
      managerId,
    }).update({
      notes,
    });

    this.logger.log(`Tenancy notes updated: id=${tenancyId} managerId=${managerId}`);

    return updated;
  }

  async unassign(managerId: string, tenancyId: string, endDate: string) {
    const tenancy = await this.prisma.db.orm.public.Tenancy.where({
      id: tenancyId,
      managerId,
    })
      .where((tenancy) =>
        tenancy.status.in([TenancyStatus.ACTIVE, TenancyStatus.NOTICE]),
      )
      .first();

    if (!tenancy) {
      this.logger.warn(
        `Tenancy unassign failed: id=${tenancyId} managerId=${managerId} no active tenancy found`,
      );
      throw new NotFoundException('Active tenancy not found');
    }

    const endDateValue = new Date(endDate);
    const status = endDateValue > new Date()
      ? TenancyStatus.NOTICE : TenancyStatus.ENDED;

    const unitStatus = endDateValue > new Date()
      ? PropertyUnitStatus.NOTICE : PropertyUnitStatus.AVAILABLE;

    await this.prisma.db.orm.public.Tenancy.where({
      id: tenancyId,
      managerId,
    }).update({
      status,
      endDate: Temporal.PlainDate.from(endDate.slice(0, 10)),
      unassignedAt: Temporal.Now.instant(),
    });

    if (tenancy.propertyUnitId) {
      await this.prisma.db.orm.public.PropertyUnit.where({
        id: tenancy.propertyUnitId,
        managerId,
      }).update({
        status: unitStatus,
      });
    }

    this.logger.log(
      `Tenancy unassigned: id=${tenancyId} managerId=${managerId} status=${status} endDate=${endDate}`,
    );

    return tenancy;
  }
}
