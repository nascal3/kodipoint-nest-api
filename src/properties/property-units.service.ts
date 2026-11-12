import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and } from '@prisma/orm-postgres/orm-client';
import { Temporal } from '@js-temporal/polyfill';

import { DatabaseService } from '@/database/database.service';
import { generateStubName } from '@/common/utils/stubs.utils';
import { CreatePropertyUnitDto } from './dto/create-property-unit.dto';
import { UpdatePropertyUnitDto } from './dto/update-property-unit.dto';
import { UpdatePropertyUnitChargeRateDto } from './dto/update-property-unit-charge-rate.dto';
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

type PropertyUnitChargeInput = {
  propertyChargeId: string;
  amount?: number;
};

@Injectable()
export class PropertyUnitsService {
  constructor(private readonly prisma: DatabaseService) {}

  private async assertStubUnique(
    managerId: string,
    propertyId: string,
    stub: string,
    excludeUnitId?: string,
  ) {
    const existingUnit = await this.prisma.db.orm.public.PropertyUnit.where(
      (unit) => {
        const conditions = [
          unit.managerId.eq(managerId),
          unit.propertyId.eq(propertyId),
          unit.stub.eq(stub),
        ];
        if (excludeUnitId) {
          conditions.push(unit.id.neq(excludeUnitId));
        }
        return and(...conditions);
      },
    ).first();

    if (existingUnit) {
      throw new BadRequestException(
        'A property unit with this unit number already exists in this property',
      );
    }
  }

  async create(managerId: string, dto: CreatePropertyUnitDto) {
    const property = await this.prisma.db.orm.public.Property.where({
      id: dto.propertyId,
      managerId,
    }).first();

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.status === 'INACTIVE') {
      throw new BadRequestException('Cannot create units for inactive properties');
    }

    const stub = generateStubName(dto.unitNumber);
    await this.assertStubUnique(managerId, dto.propertyId, stub);

    const propertyCharges = this.getPropertyCharges(dto);
    await this.validatePropertyCharges(propertyCharges, dto.propertyId);

    const unitStatus =
      property.status === 'MAINTENANCE'
        ? 'MAINTENANCE'
        : property.status === 'ARCHIVED'
          ? 'UNAVAILABLE'
          : dto.status;

    const unit = await this.prisma.db.orm.public.PropertyUnit.create({
      managerId,
      propertyId: dto.propertyId,
      propertyUseType: dto.propertyUseType,
      unitNumber: dto.unitNumber,
      stub,
      bedroomCount: dto.bedroomCount,
      status: unitStatus,
      marketRent: dto.marketRent.toString(),
      billingFrequency: dto.billingFrequency,
    });

    if (propertyCharges.length > 0) {
      const now = Temporal.Now.instant();
      await Promise.all(
        propertyCharges.map((charge) =>
          this.prisma.db.orm.public.PropertyUnitCharge.create({
            propertyUnitId: unit.id,
            propertyChargeId: charge.propertyChargeId,
            customAmount: charge.amount?.toString() ?? null,
            validFrom: now,
          }),
        ),
      );
    }

    return {
      ...unit,
      charges: await this.getUnitChargeDetails(unit.id),
    };
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
      propertyUseType,
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
      if (propertyUseType) {
        unitsQuery = unitsQuery.where({ propertyUseType });
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
      filteredUnits().orderBy(orderByClause).offset(skip).limit(limit).all(),
      filteredUnits().aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
    ]);

    const unitIds = units.map((unit) => unit.id);

    const [unitCharges, activeTenancies] = await Promise.all([
      this.prisma.db.orm.public.PropertyUnitCharge.where((charge) =>
        and(
          charge.propertyUnitId.in(unitIds),
          charge.validTo.isNull(),
        ),
      ).all(),
      this.prisma.db.orm.public.Tenancy.where((tenancy) =>
        and(
          tenancy.propertyUnitId.in(unitIds),
          tenancy.status.eq('ACTIVE'),
        ),
      ).all(),
    ]);

    const chargesByUnitId = unitCharges.reduce(
      (acc, charge) => {
        if (!acc[charge.propertyUnitId]) {
          acc[charge.propertyUnitId] = [];
        }
        acc[charge.propertyUnitId].push(charge);
        return acc;
      },
      {} as Record<string, typeof unitCharges>,
    );

    const chargeIds = unitCharges.map(
      (unitCharge) => unitCharge.propertyChargeId,
    );
    const uniqueChargeIds = [...new Set(chargeIds)];
    const tenantIds = activeTenancies.map((tenancy) => tenancy.tenantId);

    const [charges, tenants] = await Promise.all([
      uniqueChargeIds.length > 0
        ? this.prisma.db.orm.public.PropertyCharge.where((charge) =>
            charge.id.in(uniqueChargeIds),
          ).all()
        : Promise.resolve([]),
      tenantIds.length > 0
        ? this.prisma.db.orm.public.Tenant.where((tenant) =>
            tenant.id.in(tenantIds),
          ).all()
        : Promise.resolve([]),
    ]);

    const chargeById = new Map(
      charges.map((charge) => [charge.id, charge]),
    );

    const tenantById = new Map(
      tenants.map((tenant) => [tenant.id, tenant]),
    );

    const activeTenancyByUnitId = new Map(
      activeTenancies.map((tenancy) => [
        tenancy.propertyUnitId,
        tenantById.get(tenancy.tenantId),
      ]),
    );

    const unitsWithCharges = units.map((unit) => {
      const unitChargeLinks = chargesByUnitId[unit.id] || [];
      const unitChargeById = new Map(
        unitChargeLinks.map((unitCharge) => [
          unitCharge.propertyChargeId,
          unitCharge,
        ]),
      );
      const activeTenant = activeTenancyByUnitId.get(unit.id);
      return {
        ...unit,
        tenantName: activeTenant
          ? `${activeTenant.firstName} ${activeTenant.lastName}`
          : null,
        charges: unitChargeLinks.map((unitCharge) => {
          const charge = chargeById.get(unitCharge.propertyChargeId);
          return {
            ...charge,
            customAmount: unitCharge.customAmount ?? null,
            effectiveAmount: unitCharge.customAmount ?? charge?.amount,
          };
        }),
      };
    });

    const totalPages = Math.ceil(Number(totalCount.total) / limit);

    return {
      data: unitsWithCharges,
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

    const activeTenancy =
      await this.prisma.db.orm.public.Tenancy.where((tenancy) =>
        and(
          tenancy.propertyUnitId.eq(unitId),
          tenancy.status.eq('ACTIVE'),
        ),
      ).first();

    let tenantName = null;
    if (activeTenancy) {
      const tenant = await this.prisma.db.orm.public.Tenant.where({
        id: activeTenancy.tenantId,
      }).first();
      if (tenant) {
        tenantName = `${tenant.firstName} ${tenant.lastName}`;
      }
    }

    return {
      ...unit,
      tenantName,
      charges: await this.getUnitChargeDetails(unit.id),
    };
  }

  async update(managerId: string, unitId: string, dto: UpdatePropertyUnitDto) {
    const unit = await this.findOne(managerId, unitId);

    const {
      marketRent,
      propertyId,
      propertyChargeIds,
      propertyCharges: requestedCharges,
      ...rest
    } = dto;
    const shouldUpdateCharges =
      propertyChargeIds !== undefined || requestedCharges !== undefined;
    const propertyCharges = this.getPropertyCharges({
      propertyChargeIds,
      propertyCharges: requestedCharges,
    });

    if (propertyId !== undefined) {
      const property = await this.prisma.db.orm.public.Property.where({
        id: propertyId,
        managerId,
      }).first();

      if (!property) {
        throw new NotFoundException('Property not found');
      }
    }

    const targetPropertyId = propertyId ?? unit.propertyId;
    if (shouldUpdateCharges) {
      await this.validatePropertyCharges(propertyCharges, targetPropertyId);
    }

    const effectiveUnitNumber = dto.unitNumber ?? unit.unitNumber;
    const stub = generateStubName(effectiveUnitNumber);
    await this.assertStubUnique(managerId, targetPropertyId, stub, unitId);

    const updatedUnit = await this.prisma.db.orm.public.PropertyUnit.where({
      id: unitId,
      managerId,
    }).update({
      ...rest,
      ...(propertyId !== undefined && { propertyId }),
      ...(marketRent !== undefined && { marketRent: marketRent.toString() }),
      stub,
    });

    if (shouldUpdateCharges) {
      const now = Temporal.Now.instant();

      // Set validTo on currently active charges
      await this.prisma.db.orm.public.PropertyUnitCharge.where((charge) =>
        and(
          charge.propertyUnitId.eq(unitId),
          charge.validTo.isNull(),
        ),
      ).update({
        validTo: now,
      });

      // Create new charge versions
      if (propertyCharges.length > 0) {
        await Promise.all(
          propertyCharges.map((charge) =>
            this.prisma.db.orm.public.PropertyUnitCharge.create({
              propertyUnitId: unitId,
              propertyChargeId: charge.propertyChargeId,
              customAmount: charge.amount?.toString() ?? null,
              validFrom: now,
            }),
          ),
        );
      }
    }

    return {
      ...updatedUnit,
      charges: await this.getUnitChargeDetails(unitId),
    };
  }

  async updateChargeRate(
    managerId: string,
    unitId: string,
    propertyChargeId: string,
    dto: UpdatePropertyUnitChargeRateDto,
  ) {
    const effectiveFromDate = new Date(dto.effectiveFrom);
    if (Number.isNaN(effectiveFromDate.getTime())) {
      throw new BadRequestException('Invalid effective-from date');
    }
    const effectiveFrom = Temporal.Instant.fromEpochMilliseconds(
      effectiveFromDate.getTime(),
    );

    return this.prisma.db.transaction(async (tx) => {
      const unit = await tx.orm.public.PropertyUnit.where({
        id: unitId,
        managerId,
      }).first();

      if (!unit) {
        throw new NotFoundException('Property unit not found');
      }

      const propertyCharge = await tx.orm.public.PropertyCharge.where({
        id: propertyChargeId,
        propertyId: unit.propertyId,
        managerId,
      }).first();

      if (!propertyCharge) {
        throw new NotFoundException(
          'Property charge not found for this property',
        );
      }

      const rateHistory = await tx.orm.public.PropertyUnitCharge.where({
        propertyUnitId: unitId,
        propertyChargeId,
      }).all();
      const effectiveTime = effectiveFrom.epochMilliseconds;
      const currentRate = rateHistory.find(
        (rate) =>
          rate.validFrom.epochMilliseconds <= effectiveTime &&
          (rate.validTo === null ||
            rate.validTo.epochMilliseconds > effectiveTime),
      );

      if (currentRate?.validFrom.epochMilliseconds === effectiveTime) {
        throw new BadRequestException(
          'A rate already exists with this effective-from date',
        );
      }

      const nextRate = rateHistory
        .filter((rate) => rate.validFrom.epochMilliseconds > effectiveTime)
        .sort(
          (left, right) =>
            left.validFrom.epochMilliseconds - right.validFrom.epochMilliseconds,
        )[0];

      if (currentRate) {
        await tx.orm.public.PropertyUnitCharge.where({
          propertyUnitId: unitId,
          propertyChargeId,
          validFrom: currentRate.validFrom,
        }).update({
          validTo: effectiveFrom,
        });
      }

      return tx.orm.public.PropertyUnitCharge.create({
        propertyUnitId: unitId,
        propertyChargeId,
        customAmount: dto.amount.toString(),
        validFrom: effectiveFrom,
        validTo: nextRate?.validFrom ?? null,
      });
    });
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

  private getPropertyCharges(input: {
    propertyChargeIds?: string[];
    propertyCharges?: PropertyUnitChargeInput[];
  }): PropertyUnitChargeInput[] {
    if (
      input.propertyChargeIds !== undefined &&
      input.propertyCharges !== undefined
    ) {
      throw new BadRequestException(
        'Use either propertyChargeIds or propertyCharges, not both',
      );
    }

    return (
      input.propertyCharges ??
      (input.propertyChargeIds ?? []).map((propertyChargeId) => ({
        propertyChargeId,
      }))
    );
  }

  private async validatePropertyCharges(
    charges: PropertyUnitChargeInput[],
    propertyId: string,
  ) {
    const chargeIds = charges.map((charge) => charge.propertyChargeId);
    if (new Set(chargeIds).size !== chargeIds.length) {
      throw new BadRequestException('Property charges must not be duplicated');
    }

    if (chargeIds.length === 0) {
      return;
    }

    const propertyCharges =
      await this.prisma.db.orm.public.PropertyCharge.where((charge) =>
        and(
          charge.id.in(chargeIds),
          charge.propertyId.eq(propertyId),
          charge.isActive.eq(true),
        ),
      ).all();

    if (propertyCharges.length !== chargeIds.length) {
      throw new NotFoundException(
        'One or more property charges not found, do not belong to this property, or are not active',
      );
    }
  }

  private async getUnitChargeDetails(unitId: string) {
    const unitCharges =
      await this.prisma.db.orm.public.PropertyUnitCharge.where((charge) =>
        and(
          charge.propertyUnitId.eq(unitId),
          charge.validTo.isNull(),
        ),
      ).all();
    const chargeIds = unitCharges.map(
      (unitCharge) => unitCharge.propertyChargeId,
    );
    const charges =
      chargeIds.length > 0
        ? await this.prisma.db.orm.public.PropertyCharge.where((charge) =>
            charge.id.in(chargeIds),
          ).all()
        : [];
    const unitChargeById = new Map(
      unitCharges.map((unitCharge) => [
        unitCharge.propertyChargeId,
        unitCharge,
      ]),
    );

    return charges.map((charge) => {
      const unitCharge = unitChargeById.get(charge.id);
      return {
        ...charge,
        customAmount: unitCharge?.customAmount ?? null,
        effectiveAmount: unitCharge?.customAmount ?? charge.amount,
      };
    });
  }
}
