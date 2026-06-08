import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'pm' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'pm123456' })
  @IsString()
  @MinLength(6)
  password: string;
}
