import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { CreateVersionDto } from './create-version.dto';

export class UpdateVersionDto extends PartialType(CreateVersionDto) {
  @ApiProperty({ example: '1.0.0', required: false })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  milestoneId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
