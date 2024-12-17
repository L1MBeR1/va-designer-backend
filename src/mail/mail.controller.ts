import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { SendMailDto } from './dto/sendMail.dto';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
	constructor(private readonly mailService: MailService) {}

	@HttpCode(200)
	@Post('password-reset')
	async passwordResetMail(@Body() dto: SendMailDto) {
		await this.mailService.sendPasswordResetMail(dto);
		return true;
	}
}
