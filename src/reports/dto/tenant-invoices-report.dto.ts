import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class TenantInvoicesReportDto extends PaginationDto {
    @ApiProperty({ required: true })
    @IsUUID()
    tenantId: string;
}
