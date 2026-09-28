import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LayoutMode } from '@prisma/client';
import { PageBackgroundDto } from '../../common/dto/page-background.dto';

export class UpdatePageDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  pageNumber?: number;

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

  @ValidateNested()
  @Type(() => PageBackgroundDto)
  @IsOptional()
  background?: PageBackgroundDto;

  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  audioTrackId?: string | null;
}
