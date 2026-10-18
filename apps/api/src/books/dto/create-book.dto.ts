import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { BookStatus } from '@prisma/client';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

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
}
