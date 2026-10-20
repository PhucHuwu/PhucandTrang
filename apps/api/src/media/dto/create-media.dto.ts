import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsObject,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { MediaType } from '@prisma/client';

export class CreateMediaDto {
  @IsEnum(MediaType)
  type: MediaType;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsNotEmpty()
  @MaxLength(2048)
  @IsUrl(
    {
      protocols: ['https'],
      require_protocol: true,
      host_whitelist: ['res.cloudinary.com'],
    },
    { message: 'url phải là đường dẫn https trên res.cloudinary.com' },
  )
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
