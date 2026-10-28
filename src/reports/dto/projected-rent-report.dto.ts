import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class ProjectedRentReportDto extends PaginationDto {
  @ApiProperty({ required: false, description: 'Filter by property ID' })
  @IsOptional()
  propertyId?: string;
}
