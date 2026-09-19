import {
    ApiProperty,
    ApiPropertyOptional,
} from '@nestjs/swagger';
import {
    IsDateString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export enum PaymentStatus {
    PENDING = 'PENDING',
    SUCCESSFUL = 'SUCCESSFUL',
    REVERSED = 'REVERSED',
    FAILED = 'FAILED',
}

export enum PaymentMethod {
    CASH = 'CASH',
    MPESA = 'MPESA',
    BANK_TRANSFER = 'BANK_TRANSFER',
    CARD = 'CARD',
    OTHER = 'OTHER',
}

export class CreatePaymentDto {
    @ApiProperty({
        example: 'invoice-uuid',
    })
    @IsString()
    invoiceId: string;

    @ApiProperty({
        example: '75000.00',
        description: 'Payment amount in the invoice currency',
    })
    @IsNumber()
    @Min(0)
    amount: number;

    @ApiProperty({
        example: '2026-10-05',
        format: 'date',
    })
    @IsDateString()
    paymentDate: string;

    @ApiProperty({
        description: 'Payment method used',
        enum: PaymentMethod,
        example: PaymentMethod.MPESA,
    })
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @ApiPropertyOptional({
        example: 'QAB123456',
        required: false,
    })
    @IsOptional()
    @IsString()
    referenceNumber?: string;

    @ApiPropertyOptional({
        example: 'Payment received through M-Pesa',
        required: false,
    })
    @IsOptional()
    @IsString()
    notes?: string;
}