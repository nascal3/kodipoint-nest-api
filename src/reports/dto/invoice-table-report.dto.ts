import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { InvoiceStatus } from '@/invoices/dto/list-invoices.dto';
import { PaginationDto } from './pagination.dto';

export class InvoiceTableReportDto extends PaginationDto {
  @ApiPropertyOptional({ example: '2026-09-27', required: true })
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-12-27', required: true })
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus, required: false })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
