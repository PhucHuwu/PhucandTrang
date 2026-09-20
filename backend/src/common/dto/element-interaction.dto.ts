import {
  IsBoolean,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ActiveAreaRelativeDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  left: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  top: number;

  @IsNumber()
  @Min(0.001)
  @Max(1)
  width: number;

  @IsNumber()
  @Min(0.001)
  @Max(1)
  height: number;
}

export class ElementInteractionDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;

  @IsString()
  @IsIn(['open-video', 'open-link', 'flip-page', 'play-audio', 'none'], {
    message: 'Interaction action phải là một trong các action hợp lệ',
  })
  action: string;

  @IsOptional()
  target?: string | number;

  @IsString()
  @IsOptional()
  title?: string;

  @ValidateNested()
  @Type(() => ActiveAreaRelativeDto)
  @IsOptional()
  activeArea?: ActiveAreaRelativeDto;
}
