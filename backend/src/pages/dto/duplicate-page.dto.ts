import { IsInt, Min, IsOptional } from 'class-validator';

export class DuplicatePageDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  targetPageNumber?: number;
}
