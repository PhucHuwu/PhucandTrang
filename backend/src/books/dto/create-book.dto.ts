import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsDateString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { BookStatus } from '@prisma/client';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang (kebab-case)',
  })
  slug: string;

  @IsString()
  @IsNotEmpty()
  title: string;

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
  @IsNotEmpty()
  cover: Record<string, any>;

  @IsObject()
  @IsNotEmpty()
  settings: Record<string, any>;

  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  backgroundMusicId?: string | null;

  /** @deprecated Use backgroundMusicId instead */
  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  audioTrackId?: string | null;
}
