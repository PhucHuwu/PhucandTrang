import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class DuplicateLayoutTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  newId: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  newName?: string;
}
