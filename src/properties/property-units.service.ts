import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '@/database/database.service';
import { CreatePropertyUnitDto } from './dto/create-property-unit.dto';
import { UpdatePropertyUnitDto } from './dto/update-property-unit.dto';
import { ListPropertyUnitsDto } from './dto/list-property-units.dto';

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
export class PropertyUnitsService {
  constructor(private readonly prisma: DatabaseService) {}

  async create(managerId: string, dto: CreatePropertyUnitDto) {
    const property = await this.prisma.db.orm.public.Property.where({
      id: dto.propertyId,
      managerId,
    }).first();

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const { propertyChargeIds, ...unitData } = dto;

    const unit = await this.prisma.db.orm.public.PropertyUnit.create({
      managerId,
      propertyId: dto.propertyId,
      unitNumber: dto.unitNumber,
      bedroomCount: dto.bedroomCount,
      status: dto.status,
      marketRent: dto.marketRent.toString(),
      billingFrequency: dto.billingFrequency,
    });

    if (propertyChargeIds && propertyChargeIds.length > 0) {
      const charges = await this.prisma.db.orm.public.PropertyCharge.where({
        id: { in: propertyChargeIds },
        propertyId: dto.propertyId,
      }).all();

      if (charges.length !== propertyChargeIds.length) {
        throw new NotFoundException(
          'One or more property charges not found or do not belong to this property',
        );
      }

      await Promise.all(
        propertyChargeIds.map((chargeId) =>
          this.prisma.db.orm.public.PropertyUnitCharge.create({
            propertyUnitId: unit.id,
            propertyChargeId: chargeId,
          }),
        ),
      );
    }

    return unit;
  }

  async findAll(
    managerId: string,
    query: ListPropertyUnitsDto,
  ): Promise<FindAllResponse> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      propertyId,
      status,
      billingFrequency,
      unitNumber,
    } = query;
    const skip = (page - 1) * limit;

    const filteredUnits = () => {
      let unitsQuery = this.prisma.db.orm.public.PropertyUnit.where({
        managerId,
      });

      if (propertyId) {
        unitsQuery = unitsQuery.where({ propertyId });
      }
      if (status) {
        unitsQuery = unitsQuery.where({ status });
      }
      if (billingFrequency) {
        unitsQuery = unitsQuery.where({ billingFrequency });
      }
      if (unitNumber) {
        unitsQuery = unitsQuery.where((unit) =>
          unit.unitNumber.ilike(`%${unitNumber}%`),
        );
      }

      return unitsQuery;
    };

    const orderByClause = (unit: any) => {
      const field = (() => {
        switch (sortBy) {
          case 'unitNumber':
            return unit.unitNumber;
          case 'createdAt':
            return unit.createdAt;
          case 'updatedAt':
            return unit.updatedAt;
          case 'status':
            return unit.status;
          case 'marketRent':
            return unit.marketRent;
          case 'bedroomCount':
            return unit.bedroomCount;
          default:
            return unit.createdAt;
        }
      })();
      return sortOrder === 'DESC' ? field.desc() : field.asc();
    };

    const [units, totalCount] = await Promise.all([
      filteredUnits()
        .orderBy(orderByClause)
        .offset(skip)
        .limit(limit)
        .all(),
      filteredUnits().aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
    ]);

    const totalPages = Math.ceil(Number(totalCount.total) / limit);

    return {
      data: units,
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

  async findOne(managerId: string, unitId: string) {
    const unit = await this.prisma.db.orm.public.PropertyUnit.where({
      id: unitId,
      managerId,
    }).first();

    if (!unit) {
      throw new NotFoundException('Property unit not found');
    }

    return unit;
  }

  async update(managerId: string, unitId: string, dto: UpdatePropertyUnitDto) {
    const unit = await this.findOne(managerId, unitId);

    const { marketRent, propertyId, propertyChargeIds, ...rest } = dto;

    if (propertyId !== undefined) {
      const property = await this.prisma.db.orm.public.Property.where({
        id: propertyId,
        managerId,
      }).first();

      if (!property) {
        throw new NotFoundException('Property not found');
      }
    }

    const updatedUnit = await this.prisma.db.orm.public.PropertyUnit.where({
      id: unitId,
      managerId,
    }).update({
      ...rest,
      ...(propertyId !== undefined && { propertyId }),
      ...(marketRent !== undefined && { marketRent: marketRent.toString() }),
    });

    if (propertyChargeIds !== undefined) {
      const targetPropertyId = propertyId ?? unit.propertyId;

      await this.prisma.db.orm.public.PropertyUnitCharge.where({
        propertyUnitId: unitId,
      }).delete();

      if (propertyChargeIds.length > 0) {
        const charges = await this.prisma.db.orm.public.PropertyCharge.where({
          id: { in: propertyChargeIds },
          propertyId: targetPropertyId,
        }).all();

        if (charges.length !== propertyChargeIds.length) {
          throw new NotFoundException(
            'One or more property charges not found or do not belong to this property',
          );
        }

        await Promise.all(
          propertyChargeIds.map((chargeId) =>
            this.prisma.db.orm.public.PropertyUnitCharge.create({
              propertyUnitId: unitId,
              propertyChargeId: chargeId,
            }),
          ),
        );
      }
    }

    return updatedUnit;
  }

  async archive(managerId: string, unitId: string) {
    await this.findOne(managerId, unitId);

    return this.prisma.db.orm.public.PropertyUnit.where({
      id: unitId,
      managerId,
    }).update({
      status: 'ARCHIVED',
    });
  }
}
