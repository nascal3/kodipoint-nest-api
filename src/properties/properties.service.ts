import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '@/database/database.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertiesService {
    constructor(private readonly prisma: DatabaseService) {}

    async create(managerId: string, dto: CreatePropertyDto) {
        return this.prisma.db.orm.public.Property.create({
            managerId,
            name: dto.name,
            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2,
            city: dto.city,
            state: dto.state,
            postalCode: dto.postalCode,
            country: dto.country,
            description: dto.description,
            currency: dto.currency,
            monthlyRent: dto.monthlyRent.toString(),
            unitCount: dto.unitCount ?? 0,
            status: 'ACTIVE',
        });
    }

    async findAll(managerId: string) {
        return this.prisma.db.orm.public.Property
            .where({ managerId })
            .all();
    }

    async getPortfolioOccupancy(managerId: string) {
        const properties = await this.prisma.db.orm.public.Property
            .where({ managerId, status: 'ACTIVE' })
            .all();
        const propertyIds = new Set(properties.map((property) => property.id));

        const activeTenancies = await this.prisma.db.orm.public.Tenancy
            .where({ managerId, status: 'ACTIVE' })
            .all();

        const occupiedUnits = new Set(
            activeTenancies
                .filter((tenancy) => propertyIds.has(tenancy.propertyId))
                .map((tenancy) => `${tenancy.propertyId}:${tenancy.propertyUnit}`),
        ).size;
        const totalUnits = properties.reduce(
            (total, property) => total + property.unitCount,
            0,
        );

        return {
            occupancyPercentage:
                totalUnits === 0
                    ? 0
                    : Number(((occupiedUnits / totalUnits) * 100).toFixed(1)),
            occupiedUnits,
            totalUnits,
            vacantUnits: totalUnits - occupiedUnits,
        };
    }

    async findOne(managerId: string, propertyId: string) {
        const property = await this.prisma.db.orm.public.Property
            .where({
                id: propertyId,
                managerId,
            })
            .first();

        if (!property) {
            throw new NotFoundException('Property not found');
        }

        return property;
    }

    async update(
        managerId: string,
        propertyId: string,
        dto: UpdatePropertyDto,
    ) {
        await this.findOne(managerId, propertyId);

        const { monthlyRent, ...rest } = dto;

        return this.prisma.db.orm.public.Property
            .where({
                id: propertyId,
                managerId,
            })
            .update({
                ...rest,
                ...(monthlyRent !== undefined && { monthlyRent: monthlyRent.toString() })
            });
    }

    async archive(managerId: string, propertyId: string) {
        await this.findOne(managerId, propertyId);

        return this.prisma.db.orm.public.Property
            .where({
                id: propertyId,
                managerId,
            })
            .update({
                status: 'INACTIVE',
            });
    }
}