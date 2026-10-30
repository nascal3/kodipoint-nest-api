import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreateCityDto {
    @ApiProperty({
        description: 'The name of the city',
        example: 'Nairobi',
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'The ID of the country this city belongs to',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsUUID()
    countryId: string;
}
