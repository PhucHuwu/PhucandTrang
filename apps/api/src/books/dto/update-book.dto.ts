import {
  IsString,
  IsOptional,
  IsObject,
  IsDateString,
  ValidateIf,
} from 'class-validator';

export class UpdateBookDto {
  @IsString()
  @IsOptional()
  title?: string;

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
  @IsOptional()
  cover?: Record<string, any>;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;

  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  backgroundMusicId?: string | null;
}
