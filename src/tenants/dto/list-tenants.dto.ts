import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { TenantStatus } from './create-tenant.dto';

export class ListTenantsDto {
  @ApiProperty({
    required: false,
    enum: TenantStatus,
    description: 'Filter by tenant status',
  })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiProperty({
    required: false,
    description:
      'Filter by first name, last name, or phone (case-insensitive partial match)',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
