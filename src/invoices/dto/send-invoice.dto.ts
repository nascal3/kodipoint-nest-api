import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayNotEmpty,
    IsArray,
    IsEnum,
} from 'class-validator';

export enum InvoiceDeliveryChannel {
    EMAIL = 'EMAIL',
    SMS = 'SMS',
}

export class SendInvoiceDto {
    @ApiProperty({
        example: ['EMAIL', 'SMS'],
        description: 'Delivery channels',
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsEnum(InvoiceDeliveryChannel, {
        each: true,
    })
    channels: InvoiceDeliveryChannel[];
}