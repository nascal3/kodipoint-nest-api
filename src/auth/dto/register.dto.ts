import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsPhoneNumber,
    IsString,
    MinLength,
} from 'class-validator';

export class RegisterDto {
    @ApiProperty({
        example: 'manager@example.com',
        description: 'Manager email address',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'StrongPassword123!',
        description: 'Account password',
        minLength: 8,
        format: 'password',
        writeOnly: true,
    })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({
        example: 'John',
        description: 'Manager first name',
    })
    @IsString()
    firstName: string;

    @ApiProperty({
        example: 'Doe',
        description: 'Manager last name',
    })
    @IsString()
    lastName: string;

    @ApiProperty({
        description: 'The address of the user/ manager',
        example: 'P.O Box 12345 00400 Kiambu'
    })
    @IsString()
    address: string;

    @ApiProperty({
        example: '+254700000000',
        description: 'Manager phone number',
    })
    @IsPhoneNumber()
    phone: string;
}