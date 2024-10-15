import {
	BadRequestException,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Provider } from '@prisma/client';
import { verify } from 'argon2';
import axios from 'axios';
import { Response } from 'express';
import { AccountService } from 'src/account/account.service';
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
		const oldUser = await this.userService.getByEmail(dto.email);

		if (oldUser) throw new BadRequestException('User already exists');

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...user } = await this.userService.create(dto);
		const tokens = this.issueTokens(user);

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
			expiresIn: '1h',
		});
		const refreshToken = this.jwt.sign(data, {
			expiresIn: '7d',
		});

		return { accessToken, refreshToken };
	}

	private async validateUser(dto: AuthDto) {
		const user = await this.userService.getByEmail(dto.email);

		if (!user) throw new NotFoundException('User not found');

		const isValid = await verify(user.password, dto.password);

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

		const accessToken = tokenResponse.data.access_token;
		if (!accessToken) {
			throw new BadRequestException(
				'Failed to obtain access token from GitHub',
			);
		}

		const userResponse = await axios.get('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		const userData = userResponse.data;

		const emailResponse = await axios.get(
			'https://api.github.com/user/emails',
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		const emails = emailResponse.data;

		const primaryEmail = emails.find(
			(email: { primary: boolean; verified: boolean }) =>
				email.primary && email.verified,
		)?.email;

		if (!primaryEmail) {
			throw new Error('No primary verified email found for GitHub user');
		}

		let user = await this.userService.getByEmail(primaryEmail);
		if (!user) {
			user = await this.userService.createFromService({
				email: primaryEmail,
				name: userData.name,
			});
		}

		const accountDto = {
			provider: Provider.Github,
			providerAccountId: userData.id.toString(),
			userId: user.id,
		};

		await this.accountService.createOrUpdateAccount(accountDto);

		const tokens = this.issueTokens(user);

		return {
			user,
			...tokens,
		};
	}
}
