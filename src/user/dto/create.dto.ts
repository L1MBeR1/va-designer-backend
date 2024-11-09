import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateDto {
	@IsEmail()
	email: string;

	@MinLength(6, {
		message: 'Password must be at least 6 characters long',
	})
	@IsString()
	password: string;

	@IsString()
	nickname: string;
}
