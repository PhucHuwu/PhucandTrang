import { IsNumber, IsOptional } from 'class-validator';

export class DuplicateElementDto {
  @IsNumber()
  @IsOptional()
  offsetX?: number;

  @IsNumber()
  @IsOptional()
  offsetY?: number;
}
