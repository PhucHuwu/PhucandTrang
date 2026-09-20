import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsObject,
  IsBoolean,
  Min,
} from 'class-validator';
import { PageSide, LayoutMode } from '@prisma/client';

export class UpdatePageDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  pageNumber?: number;

  @IsEnum(PageSide)
  @IsOptional()
  side?: PageSide;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsString()
  @IsOptional()
  chapter?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  quote?: string;

  @IsString()
  @IsOptional()
  handwriting?: string;

  @IsString()
  @IsOptional()
  layoutTemplateId?: string;

  @IsEnum(LayoutMode)
  @IsOptional()
  layoutMode?: LayoutMode;

  @IsString()
  @IsOptional()
  sourceTemplateId?: string;

  @IsBoolean()
  @IsOptional()
  isCustomized?: boolean;

  @IsObject()
  @IsOptional()
  background?: Record<string, any>;

  @IsString()
  @IsOptional()
  audioTrackId?: string;
}
