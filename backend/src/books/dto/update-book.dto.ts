import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsDateString,
  Matches,
} from 'class-validator';
import { BookStatus } from '@prisma/client';

export class UpdateBookDto {
  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang (kebab-case)',
  })
  slug?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus;

  @IsString()
  @IsOptional()
  heName?: string;

  @IsString()
  @IsOptional()
  sheName?: string;

  @IsDateString()
  @IsOptional()
  anniversaryDate?: string;

  @IsString()
  @IsOptional()
  proposalQuote?: string;

  @IsObject()
  @IsOptional()
  cover?: Record<string, any>;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;

  @IsString()
  @IsOptional()
  backgroundMusicId?: string;

  @IsString()
  @IsOptional()
  audioTrackId?: string;
}
