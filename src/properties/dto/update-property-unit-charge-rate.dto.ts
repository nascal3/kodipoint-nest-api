import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, Min } from 'class-validator';

export class UpdatePropertyUnitChargeRateDto {
  @ApiProperty({
    description: 'The new unit-specific charge amount',
    example: 1250,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Date and time when the new rate becomes effective',
    example: '2026-11-01T00:00:00.000Z',
  })
  @IsDateString()
  effectiveFrom: string;
}
