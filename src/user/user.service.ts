import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { TokenPurpose } from '@prisma/client';
import { hash } from 'argon2';
import { AuthDto } from 'src/auth/dto/auth.dto';
import { VerifyDto } from 'src/token/dto/verify.dto';
import { TokenService } from 'src/token/token.service';
import { PrismaService } from '../prisma.service';
import { changePasswordDto } from './dto/changePassword.dto';
import { CreateFromServiceDto } from './dto/createFromService.dto';

@Injectable()
export class UserService {
	constructor(
		private prisma: PrismaService,
		private tokenService: TokenService,
	) {}

	async getById(id: number) {
		const user = await this.prisma.user.findUnique({
			where: {
				id,
			},
		});

		if (!user) {
			throw new BadRequestException('User not found');
		}

		return user;
	}

	async getByEmail(email: string) {
		const user = await this.prisma.user.findUnique({
			where: {
				email,
			},
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return user;
	}

	async checkByEmail(email: string) {
		const user = await this.prisma.user.findUnique({
			where: {
				email,
			},
		});

		if (!user) {
			null;
		}

		return user;
	}

	async getProfile(id: number) {
		const data = await this.getById(id);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...profile } = data;
		return profile;
	}

	async create(dto: AuthDto) {
		const { ...user } = await this.prisma.user.create({
			data: { email: dto.email, password: await hash(dto.password) },
		});
		const result = await this.prisma.user.update({
			where: { id: user.id },
			data: { name: await this.generateHashedNickname(user.id) },
		});

		return result;
	}
	async createFromService(dto: CreateFromServiceDto) {
		const { ...user } = await this.prisma.user.create({
			data: {
				email: dto.email,
				image: dto.image,
				emailVerified: true,
			},
		});
		const result = await this.prisma.user.update({
			where: { id: user.id },
			data: { name: await this.generateHashedNickname(user.id) },
		});
		return result;
	}
	async generateHashedNickname(id: number) {
		const salt = process.env.GENERATE_NICKNAME_SALT;

		const encoder = new TextEncoder();
		const data = encoder.encode(id + salt);

		const hashBuffer = await crypto.subtle.digest('SHA-256', data);

		const hashArray = Array.from(new Uint8Array(hashBuffer));

		const hashHex = hashArray
			.map(byte => byte.toString(16).padStart(2, '0'))
			.join('');

		return `user_${hashHex.slice(0, 12)}`;
	}

	async verifyEmail(token: string) {
		const dto: VerifyDto = { token, purpose: TokenPurpose.EMAIL_VERIFICATION };

		const result = await this.tokenService.validateToken(dto);

		const user = await this.getById(result.userId);

		if (user.emailVerified) {
			throw new BadRequestException('Email is already verified');
		}

		await this.prisma.user.update({
			where: { id: user.id },
			data: { emailVerified: true },
		});

		await this.tokenService.deleteToken(result.userId, result.purpose);

		return true;
	}

	async changePassword(dto: changePasswordDto) {
		const verifyDto: VerifyDto = {
			token: dto.token,
			purpose: TokenPurpose.PASSWORD_RESET,
		};
		const result = await this.tokenService.validateToken(verifyDto);

		const user = await this.getById(result.userId);
		await this.prisma.user.update({
			where: { id: user.id },
			data: { password: await hash(dto.password) },
		});
		await this.tokenService.deleteToken(result.userId, result.purpose);

		return true;
	}
}
