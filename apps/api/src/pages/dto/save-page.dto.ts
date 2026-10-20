import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsObject,
  IsArray,
  IsDateString,
  Min,
  Max,
  ArrayMaxSize,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ElementType, LayoutMode } from '@prisma/client';
import { PageBackgroundDto } from '../../common/dto/page-background.dto';
import { IsSafeInteraction } from '../../common/dto/element-interaction.dto';
import { IsSafeTransform } from '../../common/dto/element-transform.dto';

export class SavePageFieldsDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  chapter?: string;

  @IsString()
  @IsOptional()
  quote?: string;

  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  handwriting?: string | null;

  /** Replaced wholesale (never deep-merged). */
  @ValidateNested()
  @Type(() => PageBackgroundDto)
  @IsOptional()
  background?: PageBackgroundDto;

  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  audioTrackId?: string | null;

  @IsString()
  @IsOptional()
  layoutTemplateId?: string;

  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  sourceTemplateId?: string | null;

  @IsEnum(LayoutMode)
  @IsOptional()
  layoutMode?: LayoutMode;

  @IsBoolean()
  @IsOptional()
  isCustomized?: boolean;
}

export class SaveElementItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  /** Required only to re-create an element that no longer exists (undo of delete). */
  @IsEnum(ElementType)
  @IsOptional()
  type?: ElementType;

  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  slot?: string | null;

  @IsInt()
  @IsOptional()
  zIndex?: number;

  @IsInt()
  @IsOptional()
  order?: number;

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

  @IsSafeTransform()
  @IsOptional()
  transform?: Record<string, any>;

  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsObject()
  @IsOptional()
  style?: Record<string, any> | null;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsObject()
  @IsSafeInteraction()
  @IsOptional()
  interaction?: Record<string, any> | null;
}

export class SavePageDto {
  @ValidateNested()
  @Type(() => SavePageFieldsDto)
  @IsOptional()
  page?: SavePageFieldsDto;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SaveElementItemDto)
  @IsOptional()
  elements?: SaveElementItemDto[];

  @IsDateString()
  @IsOptional()
  baseUpdatedAt?: string;
}
