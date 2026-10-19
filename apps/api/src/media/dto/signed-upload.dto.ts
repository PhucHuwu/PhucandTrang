import { IsOptional, IsString, IsEnum } from 'class-validator';
import { MediaType } from '@prisma/client';

export class SignedUploadRequestDto {
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @IsOptional()
  @IsString()
  folder?: string;
}
