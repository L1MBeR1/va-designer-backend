import {
	registerDecorator,
	ValidationArguments,
	ValidationOptions,
	ValidatorConstraint,
	ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class MatchPasswordsConstraint implements ValidatorConstraintInterface {
	validate(confirmPassword: any, args: ValidationArguments) {
		const [relatedPropertyName] = args.constraints;
		const relatedValue = (args.object as Record<string, any>)[
			relatedPropertyName
		];
		return confirmPassword === relatedValue;
	}

	defaultMessage(args: ValidationArguments) {
		return `Confirm password does not match ${args.constraints[0]}`;
	}
}

export function MatchPasswords(
	property: string,
	validationOptions?: ValidationOptions,
) {
	return function (object: object, propertyName: string) {
		registerDecorator({
			target: object.constructor,
			propertyName: propertyName,
			options: validationOptions,
			constraints: [property],
			validator: MatchPasswordsConstraint,
		});
	};
}
