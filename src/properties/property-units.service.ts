import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and } from '@prisma/orm-postgres/orm-client';
import { Temporal } from '@js-temporal/polyfill';

import { DatabaseService } from '@/database/database.service';
import { generateStubName } from '@/common/utils/stubs.utils';
import {
  CreatePropertyUnitDto,
  PropertyUnitStatus,
} from './dto/create-property-unit.dto';
import { UpdatePropertyUnitDto } from './dto/update-property-unit.dto';
import { UpdatePropertyUnitChargeRateDto } from './dto/update-property-unit-charge-rate.dto';
import { ListPropertyUnitsDto } from './dto/list-property-units.dto';
import {PropertyStatus} from "@/properties/dto/create-property.dto";
import { TenancyStatus } from '@/tenancies/dto/assign-tenant.dto';

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

  private assertValidStatus(status: string): PropertyUnitStatus {
    const validStatuses = Object.values(PropertyUnitStatus);
    if (!validStatuses.includes(status as PropertyUnitStatus)) {
      throw new BadRequestException('Invalid property unit status');
    }

    return status as PropertyUnitStatus;
  }

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

    if (property.status === PropertyStatus.INACTIVE || property.status === PropertyStatus.ARCHIVED) {
      throw new BadRequestException('Cannot create units for inactive or archived properties');
    }

    const stub = generateStubName(dto.unitNumber);
    await this.assertStubUnique(managerId, dto.propertyId, stub);

    const propertyCharges = this.getPropertyCharges(dto);
    await this.validatePropertyCharges(propertyCharges, dto.propertyId);

    const unitStatus =
      property.status === PropertyStatus.MAINTENANCE ? PropertyUnitStatus.MAINTENANCE : dto.status;

    const unit = await this.prisma.db.transaction(async (tx) => {
      const createdUnit = await tx.orm.public.PropertyUnit.create({
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

      const incrementPlan = this.prisma.db.raw.sql`
        UPDATE public.properties
        SET unit_count = unit_count + 1
        WHERE id = ${dto.propertyId}
      `.affectedCount().build();
      await tx.execute(incrementPlan);

      if (propertyCharges.length > 0) {
        const now = Temporal.Now.instant();
        await Promise.all(
          propertyCharges.map((charge) =>
            tx.orm.public.PropertyUnitCharge.create({
              propertyUnitId: createdUnit.id,
              propertyChargeId: charge.propertyChargeId,
              customAmount: charge.amount?.toString() ?? null,
              validFrom: now,
            }),
          ),
        );
      }

      return createdUnit;
    });

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

    const [unitCharges, tenancies] = await Promise.all([
      this.prisma.db.orm.public.PropertyUnitCharge.where((charge) =>
        and(
          charge.propertyUnitId.in(unitIds),
          charge.validTo.isNull(),
        ),
      ).all(),
      this.prisma.db.orm.public.Tenancy.where((tenancy) =>
        tenancy.propertyUnitId.in(unitIds),
      ).all(),
    ]);

    const currentTenancies = tenancies.filter(
      (tenancy) =>
        tenancy.status === TenancyStatus.ACTIVE ||
        tenancy.status === TenancyStatus.NOTICE,
    );

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
    const tenantIds = currentTenancies.map((tenancy) => tenancy.tenantId);

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
      currentTenancies.map((tenancy) => [
        tenancy.propertyUnitId,
        tenantById.get(tenancy.tenantId),
      ]),
    );

    const activeTenancyIdByUnitId = new Map(
      currentTenancies.map((tenancy) => [
        tenancy.propertyUnitId,
        tenancy.id,
      ]),
    );

    const latestTenancyByUnitId = new Map<
      string,
      (typeof tenancies)[number]
    >();
    for (const tenancy of tenancies) {
      const existing = latestTenancyByUnitId.get(tenancy.propertyUnitId);
      if (
        !existing ||
        tenancy.assignedAt.epochMilliseconds >
          existing.assignedAt.epochMilliseconds
      ) {
        latestTenancyByUnitId.set(tenancy.propertyUnitId, tenancy);
      }
    }

    const unitsWithCharges = units.map((unit) => {
      const unitChargeLinks = chargesByUnitId[unit.id] || [];
      const unitChargeById = new Map(
        unitChargeLinks.map((unitCharge) => [
          unitCharge.propertyChargeId,
          unitCharge,
        ]),
      );
      const activeTenant = activeTenancyByUnitId.get(unit.id);
      const latestTenancy = latestTenancyByUnitId.get(unit.id);
      return {
        ...unit,
        tenantName: activeTenant
          ? `${activeTenant.firstName} ${activeTenant.lastName}`
          : null,
        tenant_id: activeTenant?.id ?? null,
        tenancyId: activeTenancyIdByUnitId.get(unit.id) ?? null,
        assigned_at: latestTenancy?.assignedAt ?? null,
        unassigned_at: latestTenancy?.unassignedAt ?? null,
        startDate: latestTenancy?.startDate ?? null,
        endDate: latestTenancy?.endDate ?? null,
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
          tenancy.status.in([TenancyStatus.ACTIVE, TenancyStatus.NOTICE]),
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
      status,
      ...rest
    } = dto;
    const normalizedStatus =
      status !== undefined
        ? this.assertValidStatus(status)
        : undefined;

    if (
      unit.status === PropertyUnitStatus.OCCUPIED &&
      normalizedStatus !== undefined &&
      normalizedStatus !== PropertyUnitStatus.OCCUPIED
    ) {
      throw new BadRequestException(
        'An occupied property unit cannot be changed to another status',
      );
    }

    if (unit.status === PropertyUnitStatus.ARCHIVED) {
      const hasNonStatusUpdates =
        marketRent !== undefined ||
        propertyId !== undefined ||
        propertyChargeIds !== undefined ||
        requestedCharges !== undefined ||
        Object.values(rest).some((value) => value !== undefined);

      if (hasNonStatusUpdates) {
        throw new BadRequestException(
          'Only the status can be updated for an archived property unit',
        );
      }
    }

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

    const updateData = {
      ...rest,
      ...(normalizedStatus !== undefined && { status: normalizedStatus }),
      ...(propertyId !== undefined && { propertyId }),
      ...(marketRent !== undefined && { marketRent: marketRent.toString() }),
      stub,
    };

    const isUnarchiving =
      unit.status === PropertyUnitStatus.ARCHIVED &&
      normalizedStatus !== undefined &&
      normalizedStatus !== PropertyUnitStatus.ARCHIVED;

    const updatedUnit = isUnarchiving
      ? await this.prisma.db.transaction(async (tx) => {
          const transitionPlan = this.prisma.db.raw.sql`
            UPDATE public.property_units
            SET status = ${normalizedStatus}
            WHERE id = ${unitId}
              AND manager_id = ${managerId}
              AND status = propertyUnitStatus.ARCHIVED
          `.affectedCount().build();
          const { affectedRows } = await tx.execute(transitionPlan);

          const updated = await tx.orm.public.PropertyUnit.where({
            id: unitId,
            managerId,
          }).update(updateData);

          if (affectedRows > 0) {
            const incrementPlan = this.prisma.db.raw.sql`
              UPDATE public.properties
              SET unit_count = unit_count + 1
              WHERE id = ${targetPropertyId}
            `.affectedCount().build();
            await tx.execute(incrementPlan);
          }

          return updated;
        })
      : await this.prisma.db.orm.public.PropertyUnit.where({
          id: unitId,
          managerId,
        }).update(updateData);

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
    const unit = await this.findOne(managerId, unitId);

    return this.prisma.db.transaction(async (tx) => {
      const archivePlan = this.prisma.db.raw.sql`
        UPDATE public.property_units
        SET status = 'ARCHIVED'
        WHERE id = ${unitId}
          AND manager_id = ${managerId}
          AND status <> 'ARCHIVED'
      `.affectedCount().build();
      const { affectedRows } = await tx.execute(archivePlan);

      if (affectedRows === 0) {
        return tx.orm.public.PropertyUnit.where({
          id: unitId,
          managerId,
        }).first();
      }

      const decrementPlan = this.prisma.db.raw.sql`
        UPDATE public.properties
        SET unit_count = unit_count - 1
        WHERE id = ${unit.propertyId}
      `.affectedCount().build();
      await tx.execute(decrementPlan);

      return tx.orm.public.PropertyUnit.where({
        id: unitId,
        managerId,
      }).first();
    });
  }

  private getPropertyCharges(input: {
    propertyChargeIds?: string[];
    propertyCharges?: PropertyUnitChargeInput[];
  }): PropertyUnitChargeInput[] {
    const charges = input.propertyCharges ?? [];

    if (charges.length > 0) {
      return charges;
    }

    return (input.propertyChargeIds ?? []).map((propertyChargeId) => ({
      propertyChargeId,
    }));
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
