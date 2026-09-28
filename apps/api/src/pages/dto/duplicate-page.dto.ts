import { IsInt, Min, IsOptional, IsBoolean } from 'class-validator';

export class DuplicatePageDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  targetPageNumber?: number;

  @IsBoolean()
  @IsOptional()
  insertAfter?: boolean;
}
