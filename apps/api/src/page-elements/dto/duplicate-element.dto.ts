import { IsDateString, IsNumber, IsOptional } from 'class-validator';

export class DuplicateElementDto {
  @IsNumber()
  @IsOptional()
  offsetX?: number;

  @IsNumber()
  @IsOptional()
  offsetY?: number;

  /** Optimistic concurrency: the page.updatedAt the client last saw (409 PAGE_CONFLICT on mismatch). */
  @IsDateString()
  @IsOptional()
  baseUpdatedAt?: string;
}
