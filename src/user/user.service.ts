import { BadRequestException, Injectable } from '@nestjs/common';
import { hash } from 'argon2';
import { AuthDto } from 'src/auth/dto/auth.dto';
import { PrismaService } from '../prisma.service';
import { CreateFromServiceDto } from './dto/createFromService.dto';

@Injectable()
export class UserService {
	constructor(private prisma: PrismaService) {}

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
			return null;
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
		const user = {
			// name: dto.nickname,
			email: dto.email,
			password: await hash(dto.password),
		};
		return this.prisma.user.create({
			data: user,
		});
	}
	async createFromService(dto: CreateFromServiceDto) {
		return this.prisma.user.create({
			data: {
				email: dto.email,
				name: dto.name,
				image: dto.image,
				emailVerified: true,
			},
		});
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

		return `user${hashHex.slice(0, 13)}`;
	}

	async verifyEmail(id: number) {
		const user = await this.getById(id);

		if (user.emailVerified) {
			throw new BadRequestException('Email is already verified');
		}

		await this.prisma.user.update({
			where: { id },
			data: { emailVerified: true },
		});
	}
}
