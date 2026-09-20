import { IsEnum, IsOptional, IsString, IsNumber, IsObject } from 'class-validator';
import { MediaType } from '@prisma/client';

export class UpdateMediaDto {
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
