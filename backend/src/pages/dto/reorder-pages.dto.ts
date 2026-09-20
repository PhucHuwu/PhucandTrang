import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PageSide } from '@prisma/client';

export class PageOrderItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsInt()
  @Min(0)
  pageNumber: number;

  @IsEnum(PageSide)
  @IsOptional()
  side?: PageSide;
}

export class ReorderPagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageOrderItemDto)
  items: PageOrderItemDto[];
}
