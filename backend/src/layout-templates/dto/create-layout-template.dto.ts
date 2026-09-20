import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LayoutSlotDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  defaultTransform: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  allowedTypes: string[];
}

export class TemplateElementPrototypeDto {
  @IsString()
  @IsNotEmpty()
  slot: string;

  @IsString()
  @IsNotEmpty()
  defaultType: string;

  @IsNotEmpty()
  transform: Record<string, any>;

  @IsOptional()
  zIndex?: number;

  @IsOptional()
  style?: Record<string, any>;

  @IsOptional()
  defaultData?: Record<string, any>;

  @IsOptional()
  interaction?: Record<string, any>;
}

export class CreateLayoutTemplateDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LayoutSlotDto)
  slots: LayoutSlotDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateElementPrototypeDto)
  prototypes: TemplateElementPrototypeDto[];

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}
