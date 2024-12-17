import { TokenPurpose } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class VerifyDto {
	@IsEnum(TokenPurpose)
	purpose: TokenPurpose;

	@IsString()
	token: string;
}
