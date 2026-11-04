import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationDto } from '@/reports/dto/pagination.dto';

enum PropertyUnitStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
  ARCHIVED = 'ARCHIVED',
}

enum BillingFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  BI_ANNUALLY = 'BI_ANNUALLY',
  ANNUALLY = 'ANNUALLY',
}

enum PropertyUseType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  MIXED = 'MIXED',
}

export class ListPropertyUnitsDto extends PaginationDto {
  @ApiProperty({
    required: false,
    description: 'Filter by property ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiProperty({
    required: false,
    enum: PropertyUseType,
    description: 'Filter by property unit use type',
    example: PropertyUseType.RESIDENTIAL,
  })
  @IsOptional()
  @IsEnum(PropertyUseType)
  propertyUseType?: PropertyUseType;

  @ApiProperty({
    required: false,
    enum: PropertyUnitStatus,
    description: 'Filter by property unit status',
    example: PropertyUnitStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(PropertyUnitStatus)
  status?: PropertyUnitStatus;

  @ApiProperty({
    required: false,
    enum: BillingFrequency,
    description: 'Filter by billing frequency',
    example: BillingFrequency.MONTHLY,
  })
  @IsOptional()
  @IsEnum(BillingFrequency)
  billingFrequency?: BillingFrequency;

  @ApiProperty({
    required: false,
    description: 'Filter by unit number (case-insensitive partial match)',
    example: '101',
  })
  @IsOptional()
  @IsString()
  unitNumber?: string;
}
