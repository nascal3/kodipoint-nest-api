import {
    IsDateString,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';

export class CreateInvoiceDto {
    @IsUUID()
    tenancyId: string;

    @IsDateString()
    issueDate: string;

    @IsDateString()
    dueDate: string;

    @IsOptional()
    @IsString()
    notes?: string;
}