import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateAudioTrackDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  src?: string;

  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  volume?: number;

  @IsOptional()
  @IsBoolean()
  loop?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  startAt?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fadeIn?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fadeOut?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsBoolean()
  autoPlay?: boolean;
}
