import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { and } from '@prisma/orm-postgres/orm-client';

import { DatabaseService } from '@/database/database.service';
import { CreatePropertyChargeDto } from './dto/create-property-charge.dto';
import { CreatePropertyChargesDto } from './dto/create-property-charges.dto';
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

    const existingCharge = await this.prisma.db.orm.public.PropertyCharge.where(
      (charge) => charge.name.eq(dto.name),
    ).first();

    if (existingCharge) {
      throw new ConflictException('A property charge with this name already exists');
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

  async createMany(managerId: string, dto: CreatePropertyChargesDto) {
    const results = await Promise.allSettled(
      dto.charges.map((chargeDto) => this.create(managerId, chargeDto))
    );

    const created: any[] = [];
    const errors: Array<{ index: number; charge: any; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        created.push(result.value);
      } else {
        errors.push({
          index,
          charge: dto.charges[index],
          error: result.reason.message,
        });
      }
    });

    return {
      created,
      errors,
      total: dto.charges.length,
      successful: created.length,
      failed: errors.length,
    };
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

    const { amount, propertyId, name, ...rest } = dto;

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

    if (name !== undefined) {
      const existingCharge = await this.prisma.db.orm.public.PropertyCharge.where(
        (charge) =>
          and(
            charge.name.eq(name),
            charge.id.neq(chargeId),
          ),
      ).first();

      if (existingCharge) {
        throw new ConflictException('A property charge with this name already exists');
      }
    }

    return this.prisma.db.orm.public.PropertyCharge.where(
      (charge) =>
        and(charge.id.eq(chargeId), charge.managerId.eq(managerId)),
    ).update({
      ...rest,
      ...(propertyId !== undefined && { propertyId }),
      ...(amount !== undefined && { amount: amount.toString() }),
      ...(name !== undefined && { name }),
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
