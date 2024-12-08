import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { TokenService } from './token.service';

@Controller('token')
export class TokenController {
	constructor(private readonly tokenService: TokenService) {}

	@HttpCode(200)
	@Post('verify/email')
	async verify(@Body('token') token: string) {
		await this.tokenService.verifyEmail(token);
		return true;
	}
}
