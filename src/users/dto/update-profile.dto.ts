import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsPhoneNumber,
    IsString,
    MinLength,
} from 'class-validator';

export class UpdateProfileDto {
    @ApiProperty({
        description: 'The email of the user',
        example: 'john.doe@example.com',
        required: false,
    })
    @IsEmail()
    email: string;


    @ApiProperty({
        description: 'The first name of the user',
        example: 'John',
        required: false,
    })
    @IsString()
    @MinLength(1)
    firstName: string;


    @ApiProperty({
        description: 'The last name of the user',
        example: 'Doe',
        required: false,
    })
    @IsString()
    @MinLength(1)
    lastName: string;


    @ApiProperty({
        description: 'The address of the user/ manager',
        example: 'P.O Box 12345 00400 Kiambu'
    })
    @IsString()
    address: string;


    @ApiProperty({
        description: 'The phone number of the user',
        example: '+254728762763',
        required: false,
    })
    @IsPhoneNumber()
    phone: string;
}