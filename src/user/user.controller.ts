import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import { changePasswordDto } from './dto/changePassword.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
	constructor(private readonly userService: UserService) {}

	@HttpCode(200)
	@Get('profile')
	@Auth()
	async profile(@CurrentUser('id') id: number) {
		return this.userService.getProfile(id);
	}

	@HttpCode(200)
	@Post('verify/email')
	async verifyEmail(@Body('token') token: string) {
		await this.userService.verifyEmail(token);
		return true;
	}

	@HttpCode(200)
	@Put('update/password')
	async changePassword(@Body() dto: changePasswordDto) {
		await this.userService.changePassword(dto);
		return true;
	}
}
