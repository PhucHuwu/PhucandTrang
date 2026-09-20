import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  IsObject,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ElementType } from '@prisma/client';

export class CreatePageElementDto {
  @IsString()
  @IsNotEmpty()
  pageId: string;

  @IsEnum(ElementType)
  type: ElementType;

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

  @IsObject()
  @IsNotEmpty()
  transform: Record<string, any>;

  @IsObject()
  @IsOptional()
  style?: Record<string, any>;

  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;

  @IsObject()
  @IsOptional()
  interaction?: Record<string, any>;
}
