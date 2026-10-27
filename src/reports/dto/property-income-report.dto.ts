import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class PropertyIncomeReportDto extends PaginationDto {
    @ApiProperty({ required: true })
    @IsUUID()
    propertyId: string;

    @ApiProperty({ required: true })
    @IsDateString()
    fromDate: string;

    @ApiProperty({ required: true })
    @IsDateString()
    toDate: string;
}
