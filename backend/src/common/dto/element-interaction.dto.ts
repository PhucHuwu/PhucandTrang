import {
  IsBoolean,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsIn,
  ValidateNested,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ELEMENT_INTERACTION_ACTIONS,
  ElementInteractionAction,
} from '../../../../shared/interactionContract';

export function IsStringOrNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStringOrNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (value === undefined || value === null) return true;
          return typeof value === 'string' || typeof value === 'number';
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải là chuỗi (string) hoặc số (number)`;
        },
      },
    });
  };
}

export class ActiveAreaRelativeDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  left: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  top: number;

  @IsNumber()
  @Min(0.001)
  @Max(1)
  width: number;

  @IsNumber()
  @Min(0.001)
  @Max(1)
  height: number;
}

export class ElementInteractionDto {
  @IsBoolean({ message: 'enabled phải là boolean' })
  @IsOptional()
  enabled?: boolean = true;

  @IsString()
  @IsIn(ELEMENT_INTERACTION_ACTIONS, {
    message: `Interaction action phải là một trong các action hợp lệ: ${ELEMENT_INTERACTION_ACTIONS.join(', ')}`,
  })
  action: ElementInteractionAction;

  @IsOptional()
  @IsStringOrNumber()
  target?: string | number;

  @IsString()
  @IsOptional()
  title?: string;

  @ValidateNested()
  @Type(() => ActiveAreaRelativeDto)
  @IsOptional()
  activeArea?: ActiveAreaRelativeDto;
}
