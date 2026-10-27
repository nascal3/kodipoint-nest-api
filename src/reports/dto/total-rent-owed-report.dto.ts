import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class TotalRentOwedReportDto extends PaginationDto {
    @ApiProperty({ required: true })
    @IsDateString()
    fromDate: string;

    @ApiProperty({ required: true })
    @IsDateString()
    toDate: string;
}
