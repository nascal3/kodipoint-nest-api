import {
    ApiProperty,
    ApiPropertyOptional,
} from '@nestjs/swagger';
import {
    IsNumber,
    IsOptional,
    IsString,
} from 'class-validator';

export class AllocatePaymentDto {
    @ApiProperty({
        example: 'invoice-uuid',
    })
    @IsString()
    invoiceId: string;

    @ApiProperty({
        example: '25000.00',
    })
    @IsNumber()
    amount: number;

    @ApiPropertyOptional({
        example: 'Allocated to balance brought forward',
        required: false,
    })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({
        example: 'idempotency-key-67890',
        description: 'Unique key to ensure idempotency. If provided, duplicate requests with the same key will return the cached response.',
    })
    @IsOptional()
    @IsString()
    idempotencyKey?: string;
}