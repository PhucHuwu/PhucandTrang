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
} from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsObject()
  @IsOptional()
  transform?: Record<string, any>;

  @IsObject()
  @IsOptional()
  style?: Record<string, any>;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsObject()
  @IsOptional()
  interaction?: Record<string, any>;
}

export class BatchUpdateElementsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchElementUpdateItemDto)
  elements: BatchElementUpdateItemDto[];
}
