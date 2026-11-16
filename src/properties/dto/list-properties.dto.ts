import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationDto } from '@/reports/dto/pagination.dto';
import {PropertyStatus, PropertyUseType} from "@/properties/dto/create-property.dto";

export class ListPropertiesDto extends PaginationDto {
  @ApiProperty({
    required: false,
    description: 'Filter by country ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  country?: string;

  @ApiProperty({
    required: false,
    enum: PropertyStatus,
    description: 'Filter by property status',
    example: PropertyStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiProperty({
    required: false,
    enum: PropertyUseType,
    description: 'Filter by property use type',
    example: PropertyUseType.RESIDENTIAL,
  })
  @IsOptional()
  @IsEnum(PropertyUseType)
  propertyUseType?: PropertyUseType;

  @ApiProperty({
    required: false,
    description: 'Filter by property name (case-insensitive partial match)',
    example: 'Apartment',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
