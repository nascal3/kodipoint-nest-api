import { ApiProperty } from '@nestjs/swagger';
import {
    IsDateString,
    IsOptional,
    IsString,
} from 'class-validator';

export class UpdateInvoiceDto {
    @ApiProperty({
        example: '2023-01-01',
        description: 'Invoice due date',
    })
    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @ApiProperty({
        example: 'Notes about the invoice',
        description: 'Invoice notes',
    })
    @IsOptional()
    @IsString()
    notes?: string;
}