import {
	BadRequestException,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPurpose } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user/user.service';
import { VerifyDto } from './dto/verify.dto';

@Injectable()
export class TokenService {
	EXPIRE_TOKEN = 15;

	constructor(
		private jwt: JwtService,
		private userService: UserService,
		private prisma: PrismaService,
	) {}

	async generateToken(userId: number, purpose: TokenPurpose) {
		const data = { userId, purpose };
		const token = this.jwt.sign(data, {
			expiresIn: `${this.EXPIRE_TOKEN}m`,
		});

		const hashedToken = this.hashToken(token);
		const expires = new Date(Date.now() + this.EXPIRE_TOKEN * 60 * 1000);

		await this.prisma.verificationToken.create({
			data: {
				userId,
				token: hashedToken,
				purpose,
				expires,
			},
		});

		return token;
	}

	async deleteToken(userId: number, purpose: TokenPurpose) {
		await this.prisma.verificationToken.deleteMany({
			where: {
				userId,
				purpose,
			},
		});
	}

	private hashToken(token: string) {
		return crypto.createHash('sha256').update(token).digest('hex');
	}

	async validateToken(dto: VerifyDto) {
		let result: { purpose: TokenPurpose; userId: number };
		try {
			result = await this.jwt.verifyAsync(dto.token, {
				ignoreExpiration: true,
			});
		} catch (error) {
			throw new BadRequestException('Invalid token format');
		}

		if (!result) throw new BadRequestException('Invalid token');

		if (result.purpose !== dto.purpose) {
			throw new BadRequestException('Token purpose mismatch');
		}

		const tokenRecord = await this.prisma.verificationToken.findFirst({
			where: {
				userId: result.userId,
				token: this.hashToken(dto.token),
				purpose: dto.purpose,
			},
		});

		if (!tokenRecord || tokenRecord.expires <= new Date()) {
			throw new ForbiddenException('Token has expired');
		}
		return result;
	}

	async verifyEmail(token: string) {
		const dto: VerifyDto = { token, purpose: TokenPurpose.EMAIL_VERIFICATION };

		const result = await this.validateToken(dto);

		await this.userService.verifyEmail(result.userId);

		await this.deleteToken(result.userId, result.purpose);

		return true;
	}
}
