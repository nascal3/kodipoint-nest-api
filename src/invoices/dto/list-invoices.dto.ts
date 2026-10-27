import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsDateString,
    IsOptional,
    IsString,
    IsUUID,
    IsInt,
    Min,
} from 'class-validator';

export enum InvoiceStatus {
    DRAFT= "DRAFT",
    ISSUED= "ISSUED",
    PARTIALLY_PAID= "PARTIALLY_PAID",
    PAID= "PAID",
    OVERDUE= "OVERDUE",
    CANCELLED= "CANCELLED"
}

export class ListInvoicesDto {
    @ApiProperty({
        example: 'ISSUED',
        description: 'Invoice status',
        required: false
    })
    @IsOptional()
    @IsString()
    status?: InvoiceStatus;

    @ApiProperty({
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Property ID',
    })
    @IsOptional()
    @IsUUID()
    propertyId?: string;

    @ApiProperty({
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Tenant ID',
    })
    @IsOptional()
    @IsUUID()
    tenantId?: string;

    @ApiProperty({
        example: '2023-01-01',
        description: 'Invoice date from',
    })
    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @ApiProperty({
        example: '2023-01-01',
        description: 'Invoice date to',
    })
    @IsOptional()
    @IsDateString()
    toDate?: string;

    @ApiProperty({
        example: 1,
        description: 'Page number',
        required: true
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number;

    @ApiProperty({
        example: 10,
        description: 'Number of items per page',
        required: true
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit: number;
}