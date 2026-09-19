import { ApiProperty } from '@nestjs/swagger';
import {
    IsDateString,
    IsOptional,
    IsString,
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
        example: 'DRAFT',
        description: 'Invoice status',
    })
    @IsOptional()
    @IsString()
    status?: InvoiceStatus;

    @ApiProperty({
        example: '1234567890',
        description: 'Property ID',
    })
    @IsOptional()
    @IsString()
    propertyId?: string;

    @ApiProperty({
        example: '1234567890',
        description: 'Tenant ID',
    })
    @IsOptional()
    @IsString()
    tenantId?: string;

    @ApiProperty({
        example: '2023-01-01',
        description: 'Invoice date from',
    })
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiProperty({
        example: '2023-01-01',
        description: 'Invoice date to',
    })
    @IsOptional()
    @IsDateString()
    to?: string;
}