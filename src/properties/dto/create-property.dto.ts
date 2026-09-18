import {
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

enum PropertyStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    ARCHIVED = "ARCHIVED"
}

export class CreatePropertyDto {
    @IsString()
    name: string;

    @IsString()
    addressLine1: string;

    @IsOptional()
    @IsString()
    addressLine2?: string;

    @IsString()
    city: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsString()
    status: PropertyStatus;

    @IsOptional()
    @IsString()
    postalCode?: string;

    @IsString()
    country: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    currency: string;

    @IsNumber()
    @Min(0)
    monthlyRent: number;
}