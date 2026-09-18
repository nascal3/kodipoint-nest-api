import {
    IsEmail,
    IsPhoneNumber,
    IsString,
    MinLength,
} from 'class-validator';

export class UpdateProfileDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(1)
    firstName: string;

    @IsString()
    @MinLength(1)
    lastName: string;

    @IsPhoneNumber()
    phone: string;
}