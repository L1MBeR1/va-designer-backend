import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { VerifyDto } from './dto/verify.dto';
import { TokenService } from './token.service';

@Controller('token')
export class TokenController {
	constructor(private readonly tokenService: TokenService) {}

	@HttpCode(200)
	@Post('verify/email')
	async verifyEmail(@Body('token') token: string) {
		await this.tokenService.verifyEmail(token);
		return true;
	}

	@HttpCode(200)
	@Post('verify')
	async verify(@Body() dto: VerifyDto) {
		await this.tokenService.validateToken(dto);
		return true;
	}
}
