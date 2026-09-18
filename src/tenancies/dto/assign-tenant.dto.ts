import {
    IsDateString,
    IsString,
    IsNumber,
    IsOptional,
    IsUUID,
    Min,
} from 'class-validator';


enum TenancyStatus {
    ACTIVE = "ACTIVE",
    ENDED = "ENDED"
}

export class AssignTenantDto {
    @IsString()
    status: TenancyStatus;

    @IsUUID()
    propertyId: string;

    @IsUUID()
    tenantId: string;

    @IsDateString()
    startDate: Date;

    @IsNumber()
    @Min(0)
    monthlyRent?: number;
}