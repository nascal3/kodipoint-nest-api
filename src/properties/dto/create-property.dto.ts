import { ApiProperty } from '@nestjs/swagger';
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
    @ApiProperty({
        description: 'The name of the property',
        example: 'My Property',
    })
    @IsString()
    name: string;


    @ApiProperty({
        description: 'The first line of the property address',
        example: '123 Main St',
    })
    @IsString()
    addressLine1: string;


    @ApiProperty({
        description: 'The second line of the property address',
        example: 'Apt 4B',
        required: false,
    })
    @IsOptional()
    @IsString()
    addressLine2?: string;


    @ApiProperty({
        description: 'The city where the property is located',
        example: 'South B',
    })
    @IsString()
    city: string;


    @ApiProperty({
        description: 'The state or province where the property is located',
        example: 'Nairobi',
        required: false,
    })
    @IsOptional()
    @IsString()
    state?: string;

    @ApiProperty({
        description: 'The status of the property',
        example: 'ACTIVE',
    })
    @IsString()
    status: PropertyStatus;

    @ApiProperty({
        description: 'The postal code of the property',
        example: '00200',
        required: false,
    })
    @IsOptional()
    @IsString()
    postalCode?: string;


    @ApiProperty({
        description: 'The country where the property is located',
        example: 'Kenya',
    })
    @IsString()
    country: string;


    @ApiProperty({
        description: 'The description of the property',
        example: 'A beautiful property in the heart of the city',
        required: false,
    })
    @IsOptional()
    @IsString()
    description?: string;


    @ApiProperty({
        description: 'The currency used for the property',
        example: 'KES',
    })
    @IsString()
    currency: string;


    @ApiProperty({
        description: 'The monthly rent of the property',
        example: 10000,
    })
    @IsNumber()
    @Min(0)
    monthlyRent: number;
}