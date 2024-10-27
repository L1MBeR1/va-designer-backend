import { Provider } from '@prisma/client';
import { IsEnum, IsInt, IsString } from 'class-validator';

export class CreateAccountDto {
	@IsInt()
	userId: number;

	@IsEnum(Provider)
	provider: Provider;

	@IsString()
	providerAccountId: string;

	@IsString()
	accessToken: string;
}
