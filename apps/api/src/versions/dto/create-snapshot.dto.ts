import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSnapshotDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  changelog?: string;
}
