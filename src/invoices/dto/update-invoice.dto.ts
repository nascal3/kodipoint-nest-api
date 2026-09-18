import {
    IsDateString,
    IsOptional,
    IsString,
} from 'class-validator';

export class UpdateInvoiceDto {
    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}