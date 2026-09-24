import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class SendDocumentDto {
    @ApiPropertyOptional({
        example: 'tenant@example.com or +254711XXXYYY',
        description: 'Override recipient (email for email endpoint, phone for SMS endpoint). Defaults to the tenant contact on the record.',
    })
    @IsString()
    @MaxLength(200)
    to: string;

    @ApiPropertyOptional({
        example: 'Your monthly invoice/receipt',
        required: false
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    subject?: string;

    @ApiPropertyOptional({
        example: 'Please find your invoice/receipt attached.',
    })
    @IsString()
    @MaxLength(2000)
    message: string;
}