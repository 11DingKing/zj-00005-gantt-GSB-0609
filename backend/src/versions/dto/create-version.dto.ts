import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateVersionDto {
  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  version: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  milestoneId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
