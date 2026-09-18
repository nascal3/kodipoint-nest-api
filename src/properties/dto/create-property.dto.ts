import {
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

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

    @IsOptional()
    @IsString()
    postalCode?: string;

    @IsString()
    country: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNumber()
    @Min(0)
    monthlyRent: number;
}