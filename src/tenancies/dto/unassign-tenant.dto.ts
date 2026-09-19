import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class UnassignTenantDto {
    @ApiProperty({
        description: 'The date when the tenant was unassigned from the property',
        example: '2023-07-01',
    })
    @IsDateString()
    endDate: string;
}