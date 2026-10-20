import {
  IsNumber,
  Min,
  Max,
  IsOptional,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

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

/** Same bounds as ElementTransformDto, applied to whichever fields are present. */
export const TRANSFORM_BOUNDS: Record<string, [number, number]> = {
  x: [-2, 3],
  y: [-2, 3],
  width: [0.001, 10],
  height: [0.001, 10],
  rotation: [-3600, 3600],
  scale: [0.01, 100],
  zIndex: [-1_000_000, 1_000_000],
};

const MAX_TRANSFORM_KEYS = 32;

export function transformViolation(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return 'transform phải là một object.';
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length > MAX_TRANSFORM_KEYS) {
    return 'transform chứa quá nhiều thuộc tính.';
  }
  for (const [key, [min, max]] of Object.entries(TRANSFORM_BOUNDS)) {
    if (!(key in record) || record[key] === undefined) continue;
    const v = record[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      return `transform.${key} phải là số hợp lệ.`;
    }
    if (v < min || v > max) {
      return `transform.${key} phải nằm trong khoảng [${min}, ${max}].`;
    }
  }
  return null;
}

/**
 * Lenient transform validation for bulk editor payloads (batch update, page save, apply-layout):
 * enforces ElementTransformDto bounds on known numeric fields without rejecting partial transforms
 * or extra keys already stored in production data.
 */
export function IsSafeTransform(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSafeTransform',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined) return true;
          return transformViolation(value) === null;
        },
        defaultMessage(args) {
          return transformViolation(args.value) || 'transform không hợp lệ.';
        },
      },
    });
  };
}
