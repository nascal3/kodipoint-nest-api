import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    MinLength,
} from 'class-validator';

export class ChangePasswordDto {
    @ApiProperty({
        description: 'Current password',
        example: 'currentPassword123',
        required: true,
    })
    @IsString()
    currentPassword: string;


    @ApiProperty({
        description: 'New password',
        example: 'newPassword123',
        required: true,
    })
    @IsString()
    @MinLength(8)
    newPassword: string;
}