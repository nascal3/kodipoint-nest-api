import { ApiProperty } from '@nestjs/swagger';
import {
    IsDateString,
    IsString,
    IsNumber,
    IsUUID,
    Min,
} from 'class-validator';


export enum TenancyStatus {
    ACTIVE = "ACTIVE",
    ENDED = "ENDED"
}

export class AssignTenantDto {
    @ApiProperty({
        description: 'The status of the tenancy',
        example: TenancyStatus.ACTIVE
    })
    @IsString()
    status: TenancyStatus;

    @ApiProperty({
        description: 'The ID of the property to assign the tenant to',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    propertyId: string;


    @ApiProperty({
        description: 'The ID of the tenant to assign to the property',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    tenantId: string;


    @ApiProperty({
        description: 'The start date of the tenancy',
        example: '2023-01-01',
    })
    @IsDateString()
    startDate: string;


    @ApiProperty({
        description: 'The monthly rent for the tenancy',
        example: 1000,
    })
    @IsNumber()
    @Min(0)
    monthlyRent?: number;
}