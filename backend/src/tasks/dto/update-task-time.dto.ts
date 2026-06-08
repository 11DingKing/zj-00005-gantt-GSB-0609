import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsEnum } from 'class-validator';

export enum AutoAdjustOption {
  AUTO = 'auto',
  PROMPT = 'prompt',
  NONE = 'none',
}

export class UpdateTaskTimeDto {
  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: AutoAdjustOption, required: false, default: AutoAdjustOption.NONE })
  @IsOptional()
  @IsEnum(AutoAdjustOption)
  autoAdjustDependents?: AutoAdjustOption;
}
