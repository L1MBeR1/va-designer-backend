import {
	BadRequestException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Provider } from '@prisma/client';
import { hash, verify } from 'argon2';
import axios from 'axios';
import { Response } from 'express';
import { AccountService } from 'src/account/account.service';
import { MailService } from 'src/mail/mail.service';
import { UserService } from '../user/user.service';
import { AuthDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
	EXPIRE_DAY_REFRESH_TOKEN = 1;
	REFRESH_TOKEN_NAME = 'refreshToken';

	constructor(
		private jwt: JwtService,
		private userService: UserService,
		private accountService: AccountService,
		private readonly mailService: MailService,
	) {}

	async login(dto: AuthDto) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...user } = await this.validateUser(dto);

		const tokens = this.issueTokens(user);

		return {
			user,
			...tokens,
		};
	}

	async register(dto: AuthDto) {
		const oldUser = await this.userService.checkByEmail(dto.email);

		if (oldUser) throw new BadRequestException('User already exists');

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...user } = await this.userService.create(dto);
		const tokens = this.issueTokens(user);

		await this.mailService.sendWelcomeMail(user.email);
		return {
			user,
			...tokens,
		};
	}

	async getNewTokens(refreshToken: string) {
		const result = await this.jwt.verifyAsync(refreshToken);

		if (!result) throw new UnauthorizedException('Invalid refresh token');

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...user } = await this.userService.getById(result.id);

		console.log('User data:', user);

		const tokens = this.issueTokens(user);

		return {
			user,
			...tokens,
		};
	}

	private issueTokens(user: { id: number }) {
		console.log('Issuing tokens with user data:', user);

		const data = {
			id: user.id,
		};

		const accessToken = this.jwt.sign(data, {
			expiresIn: '30m',
		});
		const refreshToken = this.jwt.sign(data, {
			expiresIn: '7d',
		});

		return { accessToken, refreshToken };
	}

	private async validateUser(dto: AuthDto) {
		const user = await this.userService.getByEmail(dto.email);

		console.log(user);
		const isValid = await verify(user.password, dto.password);
		console.log(isValid);
		if (!isValid) throw new UnauthorizedException('Invalid password');
		return user;
	}

	addRefreshTokenToResponse(res: Response, refreshToken: string) {
		const expiresIn = new Date();
		expiresIn.setDate(expiresIn.getDate() + this.EXPIRE_DAY_REFRESH_TOKEN);
		res.cookie(this.REFRESH_TOKEN_NAME, refreshToken, {
			httpOnly: true,
			domain: process.env.DOMAIN,
			expires: expiresIn,
			secure: false,
			sameSite: 'lax',
		});
	}

	removeRefreshTokenToResponse(res: Response) {
		res.cookie(this.REFRESH_TOKEN_NAME, '', {
			httpOnly: true,
			domain: process.env.DOMAIN,
			expires: new Date(0),
			secure: false,
			sameSite: 'lax',
		});
	}

	async generateState(stateLength: number): Promise<string> {
		const characters =
			'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let state = '';

		for (let i = 0; i < stateLength; i++) {
			state += characters.charAt(Math.floor(Math.random() * characters.length));
		}

		return state;
	}

	async generatePKCEData(): Promise<{
		codeVerifier: string;
		codeChallenge: string;
		state: string;
	}> {
		const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
			.map(v => v.toString(16).padStart(2, '0'))
			.join('');

		const encoder = new TextEncoder();
		const data = encoder.encode(codeVerifier);
		const digest = await crypto.subtle.digest('SHA-256', data);
		const codeChallenge = btoa(
			String.fromCharCode(...Array.from(new Uint8Array(digest))),
		)
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');

		const state = await this.generateState(32);

		return {
			codeVerifier,
			codeChallenge,
			state,
		};
	}

	async handleGitHubLogin(code: string) {
		const tokenResponse = await axios.post(
			'https://github.com/login/oauth/access_token',
			{
				client_id: process.env.GITHUB_CLIENT_ID,
				client_secret: process.env.GITHUB_CLIENT_SECRET,
				code,
				scope: 'user:email',
			},
			{
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
			},
		);
		console.log('Первый запрос');
		console.log(tokenResponse.data);
		if (!tokenResponse.data) {
			throw new BadRequestException(
				'Failed to obtain access token from GitHub',
			);
		}
		const accessToken = tokenResponse.data.access_token;

		const userResponse = await axios.get('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});
		console.log('Второй запрос');
		console.log(userResponse.data);
		if (!userResponse.data) {
			throw new BadRequestException('Failed to get user data from GitHub');
		}
		const userData = userResponse.data;
		const emailResponse = await axios.get(
			'https://api.github.com/user/emails',
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);
		console.log('Третий запрос');
		const emails = emailResponse.data;

		const primaryEmail = emails.find(
			(email: { primary: boolean; verified: boolean }) =>
				email.primary && email.verified,
		)?.email;

		if (!primaryEmail) {
			throw new Error('No primary verified email found for GitHub user');
		}

		console.log('Добавление');
		let user = await this.userService.checkByEmail(primaryEmail);
		if (!user) {
			user = await this.userService.createFromService({
				email: primaryEmail,
				name: userData.name,
				image: userData.avatar_url,
			});

			const accountDto = {
				provider: Provider.Github,
				providerAccountId: userData.id.toString(),
				userId: user.id,
				accessToken: await hash(accessToken),
			};

			await this.accountService.create(accountDto);
		}

		const account = await this.accountService.find(user.id, Provider.Github);
		if (!account) {
			const accountDto = {
				provider: Provider.Github,
				providerAccountId: userData.id.toString(),
				userId: user.id,
				accessToken: await hash(accessToken),
			};
			await this.accountService.create(accountDto);
		} else {
			await this.accountService.update(account.id, await hash(accessToken));
		}

		const tokens = this.issueTokens(user);

		return {
			user,
			...tokens,
		};
	}

	async handleYandexLogin(
		code: string,
		codeVerifier: string,
		// deviceId: string,
	) {
		console.log(code, codeVerifier);
		const authHeader = Buffer.from(
			`${process.env.YANDEX_CLIENT_ID}:${process.env.YANDEX_CLIENT_SECRET}`,
		).toString('base64');

		const tokenResponse = await axios.post(
			'https://oauth.yandex.ru/token',
			`grant_type=authorization_code&code=${code}&code_verifier=${codeVerifier}`,
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${authHeader}`,
				},
			},
		);

		console.log('Первый запрос');
		console.log(tokenResponse.data);
		if (!tokenResponse.data) {
			throw new BadRequestException(
				'Failed to obtain access token from Yandex',
			);
		}
		const accessToken = tokenResponse.data.access_token;

		const userResponse = await axios.get(
			'https://login.yandex.ru/info?format=json',
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);
		console.log('Второй запрос');
		console.log(userResponse.data);
		if (!userResponse.data) {
			throw new BadRequestException('Failed to get user data from Yandex');
		}

		const userData = userResponse.data;
		const primaryEmail = userData.default_email;

		if (!primaryEmail) {
			throw new Error('No primary email found for Yandex user');
		}

		console.log('Добавление');
		let user = await this.userService.checkByEmail(primaryEmail);
		if (!user) {
			user = await this.userService.createFromService({
				email: primaryEmail,
				name: userData.real_name || userData.display_name,
				image: userData.default_avatar_id
					? `https://avatars.yandex.net/get-yapic/${userData.default_avatar_id}/islands-200`
					: null,
			});

			const accountDto = {
				provider: Provider.Yandex,
				providerAccountId: userData.id.toString(),
				userId: user.id,
				accessToken: await hash(accessToken),
			};

			await this.accountService.create(accountDto);
		}

		const account = await this.accountService.find(user.id, Provider.Yandex);
		if (!account) {
			const accountDto = {
				provider: Provider.Yandex,
				providerAccountId: userData.id.toString(),
				userId: user.id,
				accessToken: await hash(accessToken),
			};
			await this.accountService.create(accountDto);
		} else {
			await this.accountService.update(account.id, await hash(accessToken));
		}

		const tokens = this.issueTokens(user);

		return {
			user,
			...tokens,
		};
	}
	async handleVkLogin(code: string, codeVerifier: string, deviceId: string) {
		console.log(code, codeVerifier, deviceId);

		let state = await this.generateState(32);

		const tokenResponse = await axios.post(
			'https://id.vk.com/oauth2/auth',
			`grant_type=authorization_code&code_verifier=${codeVerifier}&redirect_uri=${process.env.VK_REDIRECT_URI}&code=${code}&client_id=${process.env.VK_CLIENT_ID}&device_id=${deviceId}&state=${state}`,
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			},
		);

		console.log('Ответ на получение токена VK');
		console.log(tokenResponse.data);

		if (!tokenResponse.data) {
			throw new BadRequestException('Failed to obtain access token from VK');
		}
		if (tokenResponse.data.state !== state) {
			throw new BadRequestException('Failed to match states');
		}

		const accessToken = tokenResponse.data.access_token;

		state = await this.generateState(32);

		const userInfoResponse = await axios.post(
			'https://id.vk.com/oauth2/user_info',
			`client_id=${process.env.VK_CLIENT_ID}&access_token=${accessToken}&state=${state}`,
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			},
		);

		console.log('Ответ на получение немаскированных данных пользователя VK');
		console.log(userInfoResponse.data);

		if (!userInfoResponse.data || !userInfoResponse.data.user.email) {
			throw new BadRequestException('Failed to get user data from VK');
		}

		const userData = userInfoResponse.data.user;

		const primaryEmail = userData.email;

		if (!primaryEmail) {
			throw new Error('No primary email found for VK user');
		}

		console.log('Добавление пользователя в базу данных');
		let user = await this.userService.checkByEmail(primaryEmail);
		if (!user) {
			user = await this.userService.createFromService({
				email: primaryEmail,
				name: `${userData.first_name} `,
				image: null,
			});

			const accountDto = {
				provider: Provider.Vk,
				providerAccountId: userData.user_id.toString(),
				userId: user.id,
				accessToken: await hash(accessToken),
			};

			await this.accountService.create(accountDto);
		}

		const account = await this.accountService.find(user.id, Provider.Vk);
		if (!account) {
			const accountDto = {
				provider: Provider.Vk,
				providerAccountId: userData.user_id.toString(),
				userId: user.id,
				accessToken: await hash(accessToken),
			};
			await this.accountService.create(accountDto);
		} else {
			await this.accountService.update(account.id, await hash(accessToken));
		}

		const tokens = this.issueTokens(user);

		return {
			user,
			...tokens,
		};
	}
}
