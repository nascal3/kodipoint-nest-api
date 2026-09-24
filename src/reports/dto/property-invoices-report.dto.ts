import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class PropertyInvoicesReportDto extends PaginationDto {
    @ApiProperty({ required: true })
    @IsUUID()
    propertyId: string;
}
