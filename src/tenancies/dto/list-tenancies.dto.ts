import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { TenancyStatus } from './assign-tenant.dto';

export class ListTenanciesDto {
  @ApiProperty({
    required: false,
    enum: TenancyStatus,
    description: 'Filter by tenancy status',
  })
  @IsOptional()
  @IsEnum(TenancyStatus)
  status?: TenancyStatus;

  @ApiProperty({
    required: false,
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Number of items per page',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
