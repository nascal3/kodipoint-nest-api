import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Temporal } from '@js-temporal/polyfill';
import { and, or } from '@prisma/orm-postgres/orm-client';

import { DatabaseService } from '@/database/database.service';
import {CreateTenantDto, IdentificationDoc, TenantStatus} from './dto/create-tenant.dto';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { SearchTenantsDto } from './dto/search-tenants.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import {TenancyStatus} from "@/tenancies/dto/assign-tenant.dto";
import {PropertyUnitStatus} from "@/properties/dto/create-property-unit.dto";

export interface TenantListResponse {
  data: object[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly prisma: DatabaseService) {}

  async create(managerId: string, dto: CreateTenantDto) {
    const tenant = await this.prisma.db.orm.public.Tenant.create({
      managerId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      identificationDoc: dto.identificationDoc ?? IdentificationDoc.NATIONAL_ID,
      identificationDocNumber: dto.identificationDocNumber,
      phone: dto.phone,
      address: dto.address,
      emergencyContactName: dto.emergencyContactName,
      emergencyContactPhone: dto.emergencyContactPhone,
      emergencyContactRelationship: dto.emergencyContactRelationship,
    });

    this.logger.log(
      `Tenant created: id=${tenant.id} name="${tenant.firstName} ${tenant.lastName}" managerId=${managerId}`,
    );

    return tenant;
  }

  async findAll(
    managerId: string,
    query: ListTenantsDto,
  ): Promise<TenantListResponse> {
    const { status, name, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    let tenants = this.prisma.db.orm.public.Tenant.where({ managerId });

    if (status) {
      tenants = tenants.where((tenant) =>
        tenant.tenancies.some((tenancy) => tenancy.status.eq(status)),
      );
    }

    if (name) {
      tenants = tenants.where((tenant) =>
        or(
          tenant.firstName.ilike(`%${name}%`),
          tenant.lastName.ilike(`%${name}%`),
          tenant.phone.ilike(`%${name}%`),
        ),
      );
    }

    const [data, total] = await Promise.all([
      tenants
        .include('tenancies', (tenancies) =>
          tenancies
            .include('property', (property) => property.select('name', 'currency'))
            .include('unit', (unit) =>
              unit.select('unitNumber', 'propertyUseType', 'marketRent', 'billingFrequency', 'bedroomCount'),
            ),
        )
        .orderBy((tenant) => tenant.createdAt.desc())
        .offset(offset)
        .limit(limit)
        .all(),
      tenants.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount: Number(total.total),
        totalPages: Math.ceil(Number(total.total) / limit),
        hasNextPage: page < Math.ceil(Number(total.total) / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async search(
    managerId: string,
    query: SearchTenantsDto,
  ): Promise<TenantListResponse> {
    const { q, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;
    const term = q.trim();
    const pattern = `%${term}%`;
    const digits = term.replace(/\D/g, '');
    const parts = term.split(/\s+/).filter(Boolean);

    const tenants = this.prisma.db.orm.public.Tenant.where({ managerId }).where(
      (tenant) => {
        const conditions = [
          tenant.firstName.ilike(pattern),
          tenant.lastName.ilike(pattern),
          tenant.phone.ilike(pattern),
        ];

        if (digits.length >= 3 && digits !== term) {
          conditions.push(tenant.phone.ilike(`%${digits}%`));
        }

        if (parts.length > 1) {
          const [first, ...rest] = parts;
          const last = rest.join(' ');
          conditions.push(
            and(
              tenant.firstName.ilike(`%${first}%`),
              tenant.lastName.ilike(`%${last}%`),
            ),
            and(
              tenant.lastName.ilike(`%${first}%`),
              tenant.firstName.ilike(`%${last}%`),
            ),
          );
        }

        return or(...conditions);
      },
    );

    const [data, total] = await Promise.all([
      tenants
        .select('id', 'firstName', 'lastName', 'email', 'phone', 'createdAt')
        .orderBy((tenant) => tenant.createdAt.desc())
        .offset(offset)
        .limit(limit)
        .all(),
      tenants.aggregate((aggregate) => ({
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
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(managerId: string, tenantId: string) {
    const tenant = await this.prisma.db.orm.public.Tenant.where({
      id: tenantId,
      managerId,
    })
      .include('tenancies', (tenancies) =>
        tenancies
          .include('property', (property) => property.select('name', 'currency'))
          .include('unit', (unit) =>
            unit.select('unitNumber', 'propertyUseType', 'marketRent', 'billingFrequency', 'bedroomCount'),
          ),
      )
      .first();

    if (!tenant) {
      this.logger.warn(
        `Tenant lookup failed: id=${tenantId} managerId=${managerId} not found`,
      );
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(managerId: string, tenantId: string, dto: UpdateTenantDto) {
    await this.findOne(managerId, tenantId);

    /*
     * Tenant status is derived from tenancy status, so `status`
     * is not a Tenant column. It is still accepted on the DTO to
     * trigger the tenancy side-effect below.
     */
    const { status: tenantStatus, ...tenantData } = dto;

    const updatedTenant = await this.prisma.db.orm.public.Tenant.where({
      id: tenantId,
      managerId,
    }).update({
      ...tenantData,
    });

    if (tenantStatus === TenantStatus.NOTICE) {
      await this.prisma.db.orm.public.Tenancy.where({
        tenantId,
        managerId,
        status: TenancyStatus.ACTIVE,
      }).update({
        status: TenancyStatus.NOTICE,
      });

      this.logger.log(
        `Tenant ${tenantId} marked as NOTICE; active tenancies updated`,
      );
    }

    this.logger.log(`Tenant updated: id=${tenantId} managerId=${managerId}`);

    return updatedTenant;
  }

  async archive(managerId: string, tenantId: string) {
    await this.findOne(managerId, tenantId);

    /*
     * Archiving a tenant ends their active tenancies and frees
     * their units, mirroring the unassign flow.
     */
    const tenancies = await this.prisma.db.orm.public.Tenancy.where({
      tenantId,
      managerId,
    })
      .where((tenancy) =>
        tenancy.status.in([TenancyStatus.ACTIVE, TenancyStatus.NOTICE]),
      )
      .all();

    for (const tenancy of tenancies) {
      await this.prisma.db.orm.public.Tenancy.where({
        id: tenancy.id,
        managerId,
      }).update({
        status: TenancyStatus.ENDED,
        unassignedAt: Temporal.Now.instant(),
      });

      if (tenancy.propertyUnitId) {
        await this.prisma.db.orm.public.PropertyUnit.where({
          id: tenancy.propertyUnitId,
          managerId,
        }).update({
          status: PropertyUnitStatus.AVAILABLE,
        });
      }
    }

    this.logger.log(
      `Tenant archived: id=${tenantId} managerId=${managerId} endedTenancies=${tenancies.length}`,
    );

    return this.findOne(managerId, tenantId);
  }
}
