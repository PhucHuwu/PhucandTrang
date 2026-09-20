import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LayoutSlotDto, TemplateElementPrototypeDto } from './create-layout-template.dto';

export class UpdateLayoutTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LayoutSlotDto)
  @IsOptional()
  slots?: LayoutSlotDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateElementPrototypeDto)
  @IsOptional()
  prototypes?: TemplateElementPrototypeDto[];

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}
