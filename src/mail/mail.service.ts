import { Injectable } from '@nestjs/common';
import { TokenPurpose } from '@prisma/client';
import * as ejs from 'ejs';
import { promises as fs } from 'fs';
import * as nodemailer from 'nodemailer';
import { join } from 'path';
import { FrontPageConfig } from 'src/config/frontPage.config';
import { TokenService } from 'src/token/token.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class MailService {
	private transporter: nodemailer.Transporter;

	constructor(
		private tokenService: TokenService,
		private userService: UserService,
	) {
		this.transporter = nodemailer.createTransport({
			host: process.env.MAIL_HOST,
			port: parseInt(process.env.MAIL_PORT, 10),
			secure: false,
			auth: undefined,
		});
	}

	async renderTemplate(
		templateName: string,
		context: Record<string, any>,
	): Promise<string> {
		const templatePath = join('./templates', `${templateName}.ejs`);
		try {
			const template = await fs.readFile(templatePath, 'utf-8');
			return ejs.render(template, context);
		} catch (error) {
			console.error('Error rendering template:', error.message, error.stack);
			throw new Error('Template rendering failed');
		}
	}

	async sendMailWithTemplate(
		to: string,
		subject: string,
		template: string,
		context: Record<string, any>,
	) {
		try {
			const html = await this.renderTemplate(template, context);

			const mailOptions = {
				from: process.env.MAIL_FROM,
				to,
				subject,
				html,
			};

			const response = await this.transporter.sendMail(mailOptions);
			return response;
		} catch (error) {
			console.error('Error sending email:', error);
			throw new Error('Email sending failed');
		}
	}

	async sendWelcomeMail(to: string) {
		const template = 'welcome';
		const subject = 'Добро пожаловать в vabase!';
		const user = await this.userService.getByEmail(to);

		const token = await this.tokenService.generateToken(
			user.id,
			TokenPurpose.EMAIL_VERIFICATION,
		);

		const verificationLink = `${process.env.FRONT_URL}${FrontPageConfig.verificationPath}${FrontPageConfig.verifyEmailPath}?token=${token}`;

		const context = { verificationLink };

		return await this.sendMailWithTemplate(to, subject, template, context);
	}
}
