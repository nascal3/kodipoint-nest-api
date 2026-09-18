import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { AssignTenantDto } from './dto/assign-tenant.dto';

@Injectable()
export class TenanciesService {
    constructor(private readonly prisma: DatabaseService) {}

    async findAll(managerId: string) {
        return this.prisma.db.orm.public.Tenancy
            .where({ managerId })
            .all();
    }

    async findOne(
        managerId: string,
        tenancyId: string,
    ) {
        const tenancy = await this.prisma.db.orm.public.Tenancy
            .where({
                id: tenancyId,
                managerId,
            })
            .first();

        if (!tenancy) {
            throw new NotFoundException('Tenancy not found');
        }

        return tenancy;
    }

    async assign(managerId: string, dto: AssignTenantDto) {
        const property = await this.prisma.db.orm.public.Property
            .where({
                id: dto.propertyId,
                managerId,
            })
            .first();

        if (!property) {
            throw new NotFoundException('Property not found');
        }

        const tenant = await this.prisma.db.orm.public.Tenant
            .where({
                id: dto.tenantId,
                managerId,
            })
            .first();

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        const existing = await this.prisma.db.orm.public.Tenancy
            .where({
                managerId,
                propertyId: dto.propertyId,
                tenantId: dto.tenantId,
                status: 'ACTIVE',
            })
            .first();

        if (existing) {
            throw new ConflictException(
                'Tenant is already assigned to this property',
            );
        }

        return this.prisma.db.orm.public.Tenancy.create({
            managerId,
            propertyId: dto.propertyId,
            tenantId: dto.tenantId,
            startDate: dto.startDate,
            monthlyRent: dto.monthlyRent?.toString() ?? property.monthlyRent,
            status: 'ACTIVE',
            assignedAt: new Date(),
        });
    }

    async unassign(
        managerId: string,
        tenancyId: string,
        endDate: Date,
    ) {
        const tenancy = await this.prisma.db.orm.public.Tenancy
            .where({
                id: tenancyId,
                managerId,
                status: 'ACTIVE',
            })
            .first();

        if (!tenancy) {
            throw new NotFoundException('Active tenancy not found');
        }

        return this.prisma.db.orm.public.Tenancy
            .where({
                id: tenancyId,
                managerId,
            })
            .update({
                status: 'ENDED',
                endDate,
                unassignedAt: new Date(),
            });
    }
}