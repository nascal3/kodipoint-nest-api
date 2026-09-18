import { IsDateString } from 'class-validator';

export class UnassignTenantDto {
    @IsDateString()
    endDate: Date;
}