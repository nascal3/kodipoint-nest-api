import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendTenantMessageDto {
  @ApiProperty({
    example: 'tenant@example.com',
    description: 'Recipient email address',
  })
  @IsString()
  @MaxLength(200)
  email: string;

  @ApiProperty({
    example: '+254711XXXYYY',
    description: 'Recipient phone number',
  })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({
    example: true,
    description: 'Send message via SMS',
  })
  @IsBoolean()
  sendSms: boolean;

  @ApiProperty({
    example: true,
    description: 'Send message via email',
  })
  @IsBoolean()
  sendEmail: boolean;

  @ApiProperty({
    example: 'Tenant Notice - Golang Heights A12',
    description: 'Subject line for the email',
  })
  @IsString()
  @MaxLength(200)
  subject: string;

  @ApiProperty({
    example: 'Dear Jane Doe, This is a notice about your tenancy...',
    description: 'Message content',
  })
  @IsString()
  @MaxLength(5000)
  message: string;
}
