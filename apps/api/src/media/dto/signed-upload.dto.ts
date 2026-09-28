import { IsOptional, IsString, IsEnum, IsArray } from 'class-validator';
import { MediaType } from '@prisma/client';

export class SignedUploadRequestDto {
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
