import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  NOTICE = 'NOTICE',
  ENDED = 'ENDED',
}

export enum IdentificationDoc {
  NATIONAL_ID = 'NATIONAL_ID',
  PASSPORT = 'PASSPORT',
}

export class CreateTenantDto {
  @ApiProperty({
    description: 'The first name of the tenant',
    example: 'John',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'The last name of the tenant',
    example: 'Doe',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'The email address of the tenant',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The type of identification document',
    example: IdentificationDoc.NATIONAL_ID,
    enum: IdentificationDoc,
    default: IdentificationDoc.NATIONAL_ID,
  })
  @IsEnum(IdentificationDoc)
  identificationDoc?: IdentificationDoc;

  @ApiProperty({
    description: 'The identification document number',
    example: '12345678',
  })
  @IsString()
  identificationDocNumber: string;

  @ApiProperty({
    description: 'The phone number of the tenant',
    example: '+254718763763',
  })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({
    description: 'The address of the tenant',
    example: '123 Main St, Nairobi',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'The name of the emergency contact',
    example: 'Jane Doe',
  })
  @IsString()
  emergencyContactName: string;

  @ApiProperty({
    description: 'The phone number of the emergency contact',
    example: '+254718763763',
  })
  @IsPhoneNumber()
  emergencyContactPhone: string;

  @ApiProperty({
    description: 'The relationship of the emergency contact to the tenant',
    example: 'Spouse',
  })
  @IsString()
  emergencyContactRelationship: string;

  @ApiPropertyOptional({
    description: 'The status of the tenant',
    enum: TenantStatus,
    example: TenantStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}
