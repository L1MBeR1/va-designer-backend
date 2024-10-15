import { Injectable } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateAccountDto } from './dto/create.dto';

@Injectable()
export class AccountService {
	constructor(private readonly prisma: PrismaService) {}
	async create(accountDto: CreateAccountDto) {
		return this.prisma.account.create({
			data: {
				userId: accountDto.userId,
				provider: accountDto.provider,
				providerAccountId: accountDto.providerAccountId,
			},
		});
	}

	async getAccountsByUserId(userId: number) {
		return this.prisma.account.findMany({
			where: { userId },
		});
	}

	async linkAccountToUser(
		userId: number,
		provider: Provider,
		providerAccountId: string,
	) {
		return this.prisma.account.update({
			where: {
				provider_providerAccountId: {
					provider: provider,
					providerAccountId: providerAccountId,
				},
			},
			data: { userId },
		});
	}
	async createOrUpdateAccount(dto: CreateAccountDto) {
		const existingAccount = await this.prisma.account.findUnique({
			where: {
				provider_providerAccountId: {
					providerAccountId: dto.providerAccountId,
					provider: dto.provider,
				},
			},
		});

		if (existingAccount) {
			return this.linkAccountToUser(
				dto.userId,
				dto.provider,
				dto.providerAccountId,
			);
		} else {
			return this.create(dto);
		}
	}
}
