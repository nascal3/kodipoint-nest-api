import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class SendDocumentDto {
    @ApiPropertyOptional({
        example: 'tenant@example.com',
        description: 'Override recipient. Defaults to the tenant email on the record.',
    })
    @IsOptional()
    @IsEmail()
    to?: string;

    @ApiPropertyOptional({
        example: 'Your monthly invoice/receipt',
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    subject?: string;

    @ApiPropertyOptional({
        example: 'Please find your invoice/receipt attached.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    message?: string;
}