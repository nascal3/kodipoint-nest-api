import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchTenantsDto {
  @ApiProperty({
    description:
      'Search term matched against first name, last name, or phone (case-insensitive partial match)',
    example: 'john',
  })
  @IsString()
  q!: string;

  @ApiProperty({
    required: false,
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Number of items per page (max 50)',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
