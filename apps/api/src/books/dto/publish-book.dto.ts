import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PublishBookDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  changelog?: string;
}
