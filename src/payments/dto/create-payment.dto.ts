import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
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

export class PaymentAllocationRequestDto {
  @ApiProperty({
    example: 'invoice-uuid',
    description: 'Invoice this portion of the payment is allocated to',
  })
  @IsString()
  invoiceId: string;

  @ApiProperty({
    example: '75000.00',
    description: 'Amount allocated to the invoice',
  })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreatePaymentDto {
  @ApiProperty({
    example: 'invoice-uuid',
    description:
      'Invoice the payment is recorded against. Also used to resolve the tenant and property for allocation.',
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

  @ApiPropertyOptional({
    type: [PaymentAllocationRequestDto],
    description:
      'Optional explicit allocation plan. When omitted, the payment is auto-allocated oldest-first across the tenant\'s outstanding invoices for the same property. Any unallocated remainder stays on the payment and can be allocated later.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationRequestDto)
  allocations?: PaymentAllocationRequestDto[];

  @ApiPropertyOptional({
    example: 'payment-idempotency-key-123',
    description:
      'Unique key to ensure idempotency. Duplicate requests with the same key return the cached response.',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
