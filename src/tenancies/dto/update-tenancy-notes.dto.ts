import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTenancyNotesDto {
  @ApiPropertyOptional({
    description: 'Notes about the tenancy',
    example: 'Tenant requested a ground-floor unit',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
