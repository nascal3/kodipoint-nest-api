import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePropertyChargeDto {
  @ApiProperty({
    description: 'The ID of the property this charge belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    description: 'The name of the property charge',
    example: 'Parking Fee',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The description of the property charge',
    example: 'Monthly parking fee for residents',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The amount of the charge',
    example: 500,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Whether the charge is currently active',
    example: true,
  })
  @IsBoolean()
  isActive: boolean;
}
