import { ApiProperty } from '@nestjs/swagger';
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

    @ApiProperty({
        description: 'The first name of the tenant',
        example: 'John'
    })
    @IsString()
    firstName: string;


    @ApiProperty({
        description: 'The last name of the tenant',
        example: 'Doe'
    })
    @IsString()
    lastName: string;

    @ApiProperty({
        description: 'The email address of the tenant',
        example: 'john.doe@example.com'
    })
    @IsEmail()
    email?: string;


    @ApiProperty({
        description: 'The phone number of the tenant',
        example: '+254718763763'
    })
    @IsPhoneNumber()
    phone?: string;


    @ApiProperty({
        description: 'The address of the tenant',
        example: '123 Main St, Nairobi',
        required: false
    })
    @IsOptional()
    @IsString()
    address?: string;


    @ApiProperty({
        description: 'The status of the tenant',
        example: 'ACTIVE'
    })
    @IsString()
    status: TenancyStatus;


    @ApiProperty({
        description: 'The name of the emergency contact',
        example: 'Jane Doe',
        required: false
    })
    @IsOptional()
    @IsString()
    emergencyContactName?: string;


    @ApiProperty({
        description: 'The phone number of the emergency contact',
        example: '+254718763763',
        required: false
    })
    @IsOptional()
    @IsPhoneNumber()
    emergencyContactPhone?: string;
}