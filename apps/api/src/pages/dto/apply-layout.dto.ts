import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsBoolean,
  IsObject,
  Min,
  Max,
  ArrayMaxSize,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ElementType } from '@prisma/client';
import { IsSafeInteraction } from '../../common/dto/element-interaction.dto';
import { IsSafeTransform } from '../../common/dto/element-transform.dto';

export class ApplyLayoutItemDto {
  @IsEnum(ElementType)
  type: ElementType;

  @IsOptional()
  @IsString()
  slot?: string;

  @IsNumber()
  zIndex: number;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;

  @IsNotEmpty()
  @IsSafeTransform()
  transform: Record<string, any>;

  @IsOptional()
  @IsObject()
  style?: Record<string, any>;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsSafeInteraction()
  interaction?: Record<string, any>;
}

export class ApplyLayoutDto {
  @IsString()
  @IsNotEmpty()
  layoutTemplateId: string;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ApplyLayoutItemDto)
  elements: ApplyLayoutItemDto[];

  /** Optimistic concurrency: the page.updatedAt the client last saw (409 PAGE_CONFLICT on mismatch). */
  @IsOptional()
  @IsDateString()
  baseUpdatedAt?: string;
}
