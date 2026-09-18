import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
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
            status: 'ACTIVE',
        });
    }

    async findAll(managerId: string) {
        return this.prisma.db.orm.public.Property
            .where({ managerId })
            .all();
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