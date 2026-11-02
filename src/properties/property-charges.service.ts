import { Injectable, NotFoundException } from '@nestjs/common';
import { and } from '@prisma/orm-postgres/orm-client';

import { DatabaseService } from '@/database/database.service';
import { CreatePropertyChargeDto } from './dto/create-property-charge.dto';
import { UpdatePropertyChargeDto } from './dto/update-property-charge.dto';
import { ListPropertyChargesDto } from './dto/list-property-charges.dto';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface FindAllResponse {
  data: any[];
  pagination: PaginationMeta;
}

@Injectable()
export class PropertyChargesService {
  constructor(private readonly prisma: DatabaseService) {}

  async create(managerId: string, dto: CreatePropertyChargeDto) {
    const property = await this.prisma.db.orm.public.Property.where(
      (property) =>
        and(
          property.id.eq(dto.propertyId),
          property.managerId.eq(managerId),
        ),
    ).first();

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return this.prisma.db.orm.public.PropertyCharge.create({
      managerId,
      propertyId: dto.propertyId,
      name: dto.name,
      description: dto.description,
      amount: dto.amount.toString(),
      isActive: dto.isActive,
    });
  }

  async findAll(
    managerId: string,
    query: ListPropertyChargesDto,
  ): Promise<FindAllResponse> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      propertyId,
      isActive,
      name,
    } = query;
    const skip = (page - 1) * limit;

    const filteredCharges = () => {
      let chargesQuery = this.prisma.db.orm.public.PropertyCharge.where(
        (charge) => charge.managerId.eq(managerId),
      );

      if (propertyId) {
        chargesQuery = chargesQuery.where((charge) =>
          charge.propertyId.eq(propertyId),
        );
      }
      if (isActive !== undefined) {
        chargesQuery = chargesQuery.where((charge) =>
          charge.isActive.eq(isActive),
        );
      }
      if (name) {
        chargesQuery = chargesQuery.where((charge) =>
          charge.name.ilike(`%${name}%`),
        );
      }

      return chargesQuery;
    };

    const orderByClause = (charge: any) => {
      const field = (() => {
        switch (sortBy) {
          case 'name':
            return charge.name;
          case 'createdAt':
            return charge.createdAt;
          case 'updatedAt':
            return charge.updatedAt;
          case 'amount':
            return charge.amount;
          case 'isActive':
            return charge.isActive;
          default:
            return charge.createdAt;
        }
      })();
      return sortOrder === 'DESC' ? field.desc() : field.asc();
    };

    const [charges, totalCount] = await Promise.all([
      filteredCharges()
        .orderBy(orderByClause)
        .offset(skip)
        .limit(limit)
        .all(),
      filteredCharges().aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
    ]);

    const totalPages = Math.ceil(Number(totalCount.total) / limit);

    return {
      data: charges,
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

  async findOne(managerId: string, chargeId: string) {
    const charge = await this.prisma.db.orm.public.PropertyCharge.where(
      (charge) =>
        and(charge.id.eq(chargeId), charge.managerId.eq(managerId)),
    ).first();

    if (!charge) {
      throw new NotFoundException('Property charge not found');
    }

    return charge;
  }

  async update(managerId: string, chargeId: string, dto: UpdatePropertyChargeDto) {
    await this.findOne(managerId, chargeId);

    const { amount, propertyId, ...rest } = dto;

    if (propertyId !== undefined) {
      const property = await this.prisma.db.orm.public.Property.where(
        (property) =>
          and(
            property.id.eq(propertyId),
            property.managerId.eq(managerId),
          ),
      ).first();

      if (!property) {
        throw new NotFoundException('Property not found');
      }
    }

    return this.prisma.db.orm.public.PropertyCharge.where(
      (charge) =>
        and(charge.id.eq(chargeId), charge.managerId.eq(managerId)),
    ).update({
      ...rest,
      ...(propertyId !== undefined && { propertyId }),
      ...(amount !== undefined && { amount: amount.toString() }),
    });
  }

  async archive(managerId: string, chargeId: string) {
    await this.findOne(managerId, chargeId);

    return this.prisma.db.orm.public.PropertyCharge.where(
      (charge) =>
        and(charge.id.eq(chargeId), charge.managerId.eq(managerId)),
    ).update({
      isActive: false,
    });
  }
}
