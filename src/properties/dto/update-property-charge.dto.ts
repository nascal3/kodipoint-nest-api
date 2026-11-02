import { PartialType } from '@nestjs/mapped-types';
import { CreatePropertyChargeDto } from './create-property-charge.dto';

export class UpdatePropertyChargeDto extends PartialType(CreatePropertyChargeDto) {}
