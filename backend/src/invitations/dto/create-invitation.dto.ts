import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateInvitationDto {
  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: Role, required: false, default: Role.MEMBER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
