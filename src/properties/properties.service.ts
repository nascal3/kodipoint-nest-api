import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '@/database/database.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ListPropertiesDto } from './dto/list-properties.dto';

export interface PropertyWithOccupancy {
    id: string;
    managerId: string;
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string | null;
    postalCode: string | null;
    countryId: string;
    description: string | null;
    currency: string;
    monthlyRent: string;
    unitCount: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    occupancyRate: number;
    occupiedUnits: number;
    vacantUnits: number;
    minRent: number;
    maxRent: number;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface FindAllResponse {
    data: PropertyWithOccupancy[];
    pagination: PaginationMeta;
}

@Injectable()
export class PropertiesService {
    constructor(private readonly prisma: DatabaseService) {}

    async create(managerId: string, dto: CreatePropertyDto) {
        const country = await this.prisma.db.orm.public.Country
            .where({ id: dto.countryId })
            .first();

        if (!country) {
            throw new NotFoundException('Country not found');
        }

        return this.prisma.db.orm.public.Property.create({
            managerId,
            name: dto.name,
            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2,
            city: dto.city,
            state: dto.state,
            postalCode: dto.postalCode,
            country: (relation) => relation.connect({ id: dto.countryId }),
            description: dto.description,
            currency: dto.currency,
            monthlyRent: dto.monthlyRent.toString(),
            unitCount: dto.unitCount ?? 0,
            status: dto.status ?? 'ACTIVE',
        });
    }

    async findAll(managerId: string, query: ListPropertiesDto): Promise<FindAllResponse> {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
        const skip = (page - 1) * limit;

        const orderByClause = (property: any) => {
            const field = (() => {
                switch (sortBy) {
                    case 'name':
                        return property.name;
                    case 'createdAt':
                        return property.createdAt;
                    case 'updatedAt':
                        return property.updatedAt;
                    case 'status':
                        return property.status;
                    case 'monthlyRent':
                        return property.monthlyRent;
                    case 'unitCount':
                        return property.unitCount;
                    default:
                        return property.createdAt;
                }
            })();
            return sortOrder === 'DESC' ? field.desc() : field.asc();
        };

        const [properties, totalCount] = await Promise.all([
            this.prisma.db.orm.public.Property
                .where({ managerId })
                .orderBy(orderByClause)
                .offset(skip)
                .limit(limit)
                .all(),
            this.prisma.db.orm.public.Property
                .where({ managerId })
                .aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        const activeTenancies = await this.prisma.db.orm.public.Tenancy
            .where({ managerId, status: 'ACTIVE' })
            .all();

        const propertiesWithOccupancy = properties.map((property) => {
            const propertyTenancies = activeTenancies
                .filter((tenancy) => tenancy.propertyId === property.id);

            const occupiedUnits = new Set(
                propertyTenancies
                    .map((tenancy) => tenancy.propertyUnit),
            ).size;

            const rents = propertyTenancies.map((tenancy) => Number(tenancy.monthlyRent));
            const minRent = rents.length > 0 ? Math.min(...rents) : 0;
            const maxRent = rents.length > 0 ? Math.max(...rents) : 0;

            const totalUnits = property.unitCount;
            const occupancyRate = totalUnits === 0
                ? 0
                : Number(((occupiedUnits / totalUnits) * 100).toFixed(1));
            const vacantUnits = totalUnits - occupiedUnits;

            return {
                ...property,
                occupancyRate,
                occupiedUnits,
                vacantUnits,
                minRent,
                maxRent,
            };
        });

        const totalPages = Math.ceil(Number(totalCount.total) / limit);

        return {
            data: propertiesWithOccupancy,
            pagination: {
                page,
                limit,
                totalCount: Number(totalCount.total),
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
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

        const { monthlyRent, countryId, ...rest } = dto;

        if (countryId !== undefined) {
            const country = await this.prisma.db.orm.public.Country
                .where({ id: countryId })
                .first();

            if (!country) {
                throw new NotFoundException('Country not found');
            }
        }

        return this.prisma.db.orm.public.Property
            .where({
                id: propertyId,
                managerId,
            })
            .update({
                ...rest,
                ...(countryId !== undefined && {
                    country: (relation) => relation.connect({ id: countryId }),
                }),
                ...(monthlyRent !== undefined && { monthlyRent: monthlyRent.toString() }),
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