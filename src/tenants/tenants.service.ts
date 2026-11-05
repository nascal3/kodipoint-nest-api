import { Injectable, NotFoundException } from '@nestjs/common';
import { or } from '@prisma/orm-postgres/orm-client';

import { DatabaseService } from '@/database/database.service';
import { CreateTenantDto, TenantStatus } from './dto/create-tenant.dto';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

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
  constructor(private readonly prisma: DatabaseService) {}

  async create(managerId: string, dto: CreateTenantDto) {
    return this.prisma.db.orm.public.Tenant.create({
      managerId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      emergencyContactName: dto.emergencyContactName,
      emergencyContactPhone: dto.emergencyContactPhone,
      emergencyContactRelationship: dto.emergencyContactRelationship,
      status: TenantStatus.ACTIVE,
    });
  }

  async findAll(
    managerId: string,
    query: ListTenantsDto,
  ): Promise<TenantListResponse> {
    const { status, name, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    let tenants = this.prisma.db.orm.public.Tenant.where({ managerId });

    if (status) {
      tenants = tenants.where({ status });
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
              unit.select('unitNumber', 'marketRent', 'billingFrequency', 'bedroomCount'),
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

  async findOne(managerId: string, tenantId: string) {
    const tenant = await this.prisma.db.orm.public.Tenant.where({
      id: tenantId,
      managerId,
    }).first();

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(managerId: string, tenantId: string, dto: UpdateTenantDto) {
    await this.findOne(managerId, tenantId);

    const updatedTenant = await this.prisma.db.orm.public.Tenant.where({
      id: tenantId,
      managerId,
    }).update({
      ...dto,
    });

    if (dto.status === TenantStatus.NOTICE) {
      await this.prisma.db.orm.public.Tenancy.where({
        tenantId,
        managerId,
        status: 'ACTIVE',
      }).update({
        status: 'EXPIRING',
      });
    }

    return updatedTenant;
  }

  async archive(managerId: string, tenantId: string) {
    await this.findOne(managerId, tenantId);

    return this.prisma.db.orm.public.Tenant.where({
      id: tenantId,
      managerId,
    }).update({
      status: TenantStatus.ENDED,
    });
  }
}
