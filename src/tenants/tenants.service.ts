import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '@/database/database.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

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
            status: 'ACTIVE',
        });
    }

    async findAll(managerId: string) {
        return this.prisma.db.orm.public.Tenant
            .where({ managerId })
            .all();
    }

    async findOne(managerId: string, tenantId: string) {
        const tenant = await this.prisma.db.orm.public.Tenant
            .where({
                id: tenantId,
                managerId,
            })
            .first();

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        return tenant;
    }

    async update(
        managerId: string,
        tenantId: string,
        dto: UpdateTenantDto,
    ) {
        await this.findOne(managerId, tenantId);

        return this.prisma.db.orm.public.Tenant
            .where({
                id: tenantId,
                managerId,
            })
            .update({
                ...dto,
            });
    }

    async archive(managerId: string, tenantId: string) {
        await this.findOne(managerId, tenantId);

        return this.prisma.db.orm.public.Tenant
            .where({
                id: tenantId,
                managerId,
            })
            .update({
                status: 'INACTIVE',
            });
    }
}