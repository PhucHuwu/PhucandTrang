import { IsNumber, Min, Max, IsOptional } from 'class-validator';

export class ElementTransformDto {
  @IsNumber()
  @Min(-2, { message: 'Tọa độ X phải >= -2' })
  @Max(3, { message: 'Tọa độ X phải <= 3' })
  x: number;

  @IsNumber()
  @Min(-2, { message: 'Tọa độ Y phải >= -2' })
  @Max(3, { message: 'Tọa độ Y phải <= 3' })
  y: number;

  @IsNumber()
  @Min(0.001, { message: 'Chiều rộng width phải > 0' })
  @Max(10, { message: 'Chiều rộng width không được vượt quá 10' })
  width: number;

  @IsNumber()
  @Min(0.001, { message: 'Chiều cao height phải > 0' })
  @Max(10, { message: 'Chiều cao height không được vượt quá 10' })
  height: number;

  @IsNumber()
  @Min(-3600, { message: 'Góc xoay rotation phải >= -3600' })
  @Max(3600, { message: 'Góc xoay rotation phải <= 3600' })
  rotation: number;

  @IsNumber()
  @Min(0.01, { message: 'Tỉ lệ scale phải >= 0.01' })
  @Max(100, { message: 'Tỉ lệ scale phải <= 100' })
  scale: number;

  @IsOptional()
  @IsNumber()
  zIndex?: number;
}
