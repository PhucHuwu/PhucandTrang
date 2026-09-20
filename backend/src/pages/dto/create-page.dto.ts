import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  IsObject,
  IsBoolean,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PageSide, LayoutMode } from '@prisma/client';

export class CreatePageDto {
  @IsString()
  @IsNotEmpty()
  bookId: string;

  @IsInt()
  @Min(0)
  pageNumber: number;

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
  @IsNotEmpty()
  background: Record<string, any>;

  @IsString()
  @IsOptional()
  audioTrackId?: string;
}
