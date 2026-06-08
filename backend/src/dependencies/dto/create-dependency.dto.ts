import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DependencyType } from '@prisma/client';

export class CreateDependencyDto {
  @ApiProperty()
  @IsString()
  fromTaskId: string;

  @ApiProperty()
  @IsString()
  toTaskId: string;

  @ApiProperty({ enum: DependencyType, required: false, default: DependencyType.FS })
  @IsOptional()
  @IsEnum(DependencyType)
  type?: DependencyType;
}
