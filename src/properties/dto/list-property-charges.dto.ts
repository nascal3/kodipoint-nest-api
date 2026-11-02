import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationDto } from '@/reports/dto/pagination.dto';

export class ListPropertyChargesDto extends PaginationDto {
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
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    required: false,
    description: 'Filter by charge name (case-insensitive partial match)',
    example: 'Parking',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
