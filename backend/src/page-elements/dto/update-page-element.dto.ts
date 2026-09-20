import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsObject,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ElementType } from '@prisma/client';
import { ElementTransformDto } from '../../common/dto/element-transform.dto';
import { ElementInteractionDto } from '../../common/dto/element-interaction.dto';

export class UpdatePageElementDto {
  @IsEnum(ElementType)
  @IsOptional()
  type?: ElementType;

  @IsString()
  @IsOptional()
  slot?: string;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsInt()
  @IsOptional()
  zIndex?: number;

  @IsBoolean()
  @IsOptional()
  visible?: boolean;

  @IsBoolean()
  @IsOptional()
  locked?: boolean;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  opacity?: number;

  @ValidateNested()
  @Type(() => ElementTransformDto)
  @IsOptional()
  transform?: ElementTransformDto;

  @IsObject()
  @IsOptional()
  style?: Record<string, any>;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ValidateNested()
  @Type(() => ElementInteractionDto)
  @IsOptional()
  interaction?: ElementInteractionDto;
}
