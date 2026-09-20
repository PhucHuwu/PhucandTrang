import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ElementOrderItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsInt()
  @Min(0)
  zIndex: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

export class ReorderElementsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ElementOrderItemDto)
  items: ElementOrderItemDto[];
}
