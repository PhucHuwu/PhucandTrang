import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateAudioTrackDto {
  @IsNotEmpty()
  @IsString()
  title: string;

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
  volume?: number = 0.8;

  @IsOptional()
  @IsBoolean()
  loop?: boolean = true;

  @IsOptional()
  @IsNumber()
  @Min(0)
  startAt?: number = 0.0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fadeIn?: number = 0.0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fadeOut?: number = 0.0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsBoolean()
  autoPlay?: boolean = true;
}
