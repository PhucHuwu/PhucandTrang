import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsIn,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FocalPointDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y: number;
}

export class GradientStopDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  offset: number;

  @IsString()
  color: string;
}

export class LinearGradientDto {
  @IsString()
  type: string = 'linear';

  @IsNumber()
  @IsOptional()
  angle?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradientStopDto)
  stops: GradientStopDto[];
}

export class HeaderFadeDto {
  @IsOptional()
  enabled?: boolean;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  height?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  startOpacity?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  endOpacity?: number;
}

export class GutterFadeDto {
  @IsOptional()
  enabled?: boolean;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  width?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  opacity?: number;
}

export class PageBackgroundDto {
  @IsString()
  @IsIn(['color', 'image', 'gradient'], {
    message: 'Background type phải là "color", "image" hoặc "gradient"',
  })
  type: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  mediaId?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  opacity?: number;

  @IsString()
  @IsIn(['cover', 'contain', 'fill'], {
    message: 'objectFit phải là "cover", "contain" hoặc "fill"',
  })
  @IsOptional()
  objectFit?: string;

  @ValidateNested()
  @Type(() => FocalPointDto)
  @IsOptional()
  focalPoint?: FocalPointDto;

  @ValidateNested()
  @Type(() => LinearGradientDto)
  @IsOptional()
  gradient?: LinearGradientDto;

  @ValidateNested()
  @Type(() => HeaderFadeDto)
  @IsOptional()
  headerFade?: HeaderFadeDto;

  @ValidateNested()
  @Type(() => GutterFadeDto)
  @IsOptional()
  gutterFade?: GutterFadeDto;
}
