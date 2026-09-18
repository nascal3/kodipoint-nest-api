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
    @IsArray()
    @ArrayNotEmpty()
    @IsEnum(InvoiceDeliveryChannel, {
        each: true,
    })
    channels: InvoiceDeliveryChannel[];
}