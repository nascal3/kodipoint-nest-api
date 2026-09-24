import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class AllPropertiesIncomeReportDto extends PaginationDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsDateString()
    toDate?: string;
}
