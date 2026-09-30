import { IsNotEmpty, IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ApplyLayoutItemDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  slot?: string;

  @IsNotEmpty()
  zIndex: number;

  @IsOptional()
  order?: number;

  @IsOptional()
  visible?: boolean;

  @IsOptional()
  locked?: boolean;

  @IsOptional()
  opacity?: number;

  @IsNotEmpty()
  transform: Record<string, any>;

  @IsOptional()
  style?: Record<string, any>;

  @IsOptional()
  data?: Record<string, any>;

  @IsOptional()
  interaction?: Record<string, any>;
}

export class ApplyLayoutDto {
  @IsString()
  @IsNotEmpty()
  layoutTemplateId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplyLayoutItemDto)
  elements: ApplyLayoutItemDto[];
}
