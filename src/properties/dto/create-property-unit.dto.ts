import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

class PropertyUnitChargeDto {
  @ApiProperty({
    description: 'The ID of the property charge to associate with this unit',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  propertyChargeId: string;

  @ApiProperty({
    description:
      'Optional unit-specific amount; omit it to inherit the property charge amount',
    example: 2500,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}

export class CreatePropertyUnitDto {
  @ApiProperty({
    description: 'The ID of the property this unit belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    description: 'The unit number or identifier',
    example: '101',
  })
  @IsString()
  unitNumber: string;

  @ApiProperty({
    description: 'The number of bedrooms in the unit',
    example: 2,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  bedroomCount: number;

  @ApiProperty({
    description: 'The status of the property unit',
    example: 'AVAILABLE',
    enum: PropertyUnitStatus,
  })
  @IsEnum(PropertyUnitStatus)
  status: PropertyUnitStatus;

  @ApiProperty({
    description: 'The market rent for this unit',
    example: 15000,
  })
  @IsNumber()
  @Min(0)
  marketRent: number;

  @ApiProperty({
    description: 'The billing frequency for rent payments',
    example: 'MONTHLY',
    enum: BillingFrequency,
  })
  @IsEnum(BillingFrequency)
  billingFrequency: BillingFrequency;

  @ApiProperty({
    description: 'Array of property charge IDs to associate with this unit',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  propertyChargeIds?: string[];

  @ApiProperty({
    description:
      'Property charges to associate with this unit, optionally overriding each charge amount',
    example: [
      {
        propertyChargeId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 2500,
      },
    ],
    required: false,
    type: [PropertyUnitChargeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyUnitChargeDto)
  propertyCharges?: PropertyUnitChargeDto[];
}
