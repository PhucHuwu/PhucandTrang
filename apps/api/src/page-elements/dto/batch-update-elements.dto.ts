import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsNumber,
  IsObject,
  Min,
  Max,
  ArrayMaxSize,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsSafeInteraction } from '../../common/dto/element-interaction.dto';
import { IsSafeTransform } from '../../common/dto/element-transform.dto';

export class BatchElementUpdateItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsInt()
  @IsOptional()
  zIndex?: number;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  visible?: boolean;

  @IsBoolean()
  @IsOptional()
  locked?: boolean;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  opacity?: number;

  @IsSafeTransform()
  @IsOptional()
  transform?: Record<string, any>;

  /** Replaced wholesale when provided; null clears the column. */
  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsObject()
  @IsOptional()
  style?: Record<string, any> | null;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  /** Replaced wholesale when provided; null clears the column. */
  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsObject()
  @IsSafeInteraction()
  @IsOptional()
  interaction?: Record<string, any> | null;
}

export class BatchUpdateElementsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BatchElementUpdateItemDto)
  elements: BatchElementUpdateItemDto[];
}
