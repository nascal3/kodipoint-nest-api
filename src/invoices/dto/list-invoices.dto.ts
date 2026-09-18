import {
    IsDateString,
    IsOptional,
    IsString,
} from 'class-validator';

enum InvoiceStatus {
    DRAFT= "DRAFT",
    ISSUED= "ISSUED",
    PARTIALLY_PAID= "PARTIALLY_PAID",
    PAID= "PAID",
    OVERDUE= "OVERDUE",
    CANCELLED= "CANCELLED"
}

export class ListInvoicesDto {
    @IsOptional()
    @IsString()
    status?: InvoiceStatus;

    @IsOptional()
    @IsString()
    propertyId?: string;

    @IsOptional()
    @IsString()
    tenantId?: string;

    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;
}