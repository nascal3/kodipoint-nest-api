import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateCountryDto {
    @ApiProperty({
        description: 'The name of the country',
        example: 'Kenya',
    })
    @IsString()
    name: string;
}
