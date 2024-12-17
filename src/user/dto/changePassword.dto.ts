import { IsString, MinLength } from 'class-validator';
import { MatchPasswords } from 'src/validators/matchPassword.validator';

export class changePasswordDto {
	@IsString()
	@MinLength(6, { message: 'New password must be at least 6 characters long' })
	password: string;

	@IsString()
	@MinLength(6, {
		message: 'Confirm password must be at least 6 characters long',
	})
	@MatchPasswords('password', {
		message: 'Confirm password does not match new password',
	})
	confirmPassword: string;

	@IsString()
	token: string;
}
