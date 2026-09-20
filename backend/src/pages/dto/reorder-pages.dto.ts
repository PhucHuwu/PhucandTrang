import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PageOrderItemDto {
  @IsString({ message: 'Page id phải là chuỗi' })
  @IsNotEmpty({ message: 'Page id không được để trống' })
  id: string;
}

export class ReorderPagesDto {
  @IsArray({ message: 'Danh sách items phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => PageOrderItemDto)
  items: PageOrderItemDto[];
}
