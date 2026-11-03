import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreatePropertyChargeDto } from './create-property-charge.dto';

export class CreatePropertyChargesDto {
  @ApiProperty({
    description: 'Array of property charges to create',
    type: [CreatePropertyChargeDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePropertyChargeDto)
  charges: CreatePropertyChargeDto[];
}
