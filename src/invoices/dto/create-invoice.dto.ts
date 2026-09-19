import { ApiProperty } from '@nestjs/swagger';
import {
    IsDateString,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';

export class CreateInvoiceDto {
    @ApiProperty({
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Tenancy ID',
    })
    @IsUUID()
    tenancyId: string;

    @ApiProperty({
        example: '2023-07-01',
        description: 'Invoice issue date',
    })
    @IsDateString()
    issueDate: string;

    @ApiProperty({
        example: '2023-07-15',
        description: 'Invoice due date',
    })
    @IsDateString()
    dueDate: string;

    @ApiProperty({
        example: 'Notes about the invoice',
        description: 'Invoice notes',
        required: false
    })
    @IsOptional()
    @IsString()
    notes?: string;
}