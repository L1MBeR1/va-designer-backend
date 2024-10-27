import { IsEmail, IsString } from 'class-validator';

export class CreateFromServiceDto {
	@IsEmail()
	email: string;

	@IsString()
	name: string;

	@IsString()
	image: string;
}
