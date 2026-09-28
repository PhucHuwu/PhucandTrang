import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsObject } from 'class-validator';
import { MediaType } from '@prisma/client';

export class CreateMediaDto {
  @IsEnum(MediaType)
  type: MediaType;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsNotEmpty()
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
