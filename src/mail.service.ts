import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
@Injectable()
export class MailService {
	private transporter: nodemailer.Transporter;

	constructor() {
		this.transporter = nodemailer.createTransport({
			host: process.env.MAIL_HOST,
			port: parseInt(process.env.MAIL_PORT, 10),
			secure: false,
			auth: undefined,
		});
	}

	async sendMail(to: string, subject: string, text: string, html?: string) {
		console.log(process.env.MAIL_FROM);
		console.log(process.env.MAIL_HOST);
		console.log(process.env.MAIL_PORT);
		const mailOptions = {
			from: process.env.MAIL_FROM,
			to,
			subject,
			text,
			html,
		};

		return this.transporter.sendMail(mailOptions);
	}
}
