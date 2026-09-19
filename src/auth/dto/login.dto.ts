import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsString,
    MinLength,
} from 'class-validator';

export class LoginDto {
    @ApiProperty({
        example: 'manager@example.com',
        description: 'Manager email address',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'StrongPassword123!',
        description: 'Manager password',
    })
    @IsString()
    @MinLength(8)
    password: string;
}