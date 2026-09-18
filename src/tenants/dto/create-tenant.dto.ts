import {
    IsEmail,
    IsOptional,
    IsPhoneNumber,
    IsString,
} from 'class-validator';

enum TenancyStatus {
    ACTIVE = "ACTIVE",
    ENDED = "ENDED"
}

export class CreateTenantDto {
    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsEmail()
    email?: string;

    @IsPhoneNumber()
    phone?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsString()
    status: TenancyStatus;

    @IsString()
    emergencyContactName?: string;

    @IsPhoneNumber()
    emergencyContactPhone?: string;
}