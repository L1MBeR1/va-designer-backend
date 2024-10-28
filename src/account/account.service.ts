import { Injectable } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateAccountDto } from './dto/create.dto';

@Injectable()
export class AccountService {
	constructor(private readonly prisma: PrismaService) {}

	async find(userId: number, provider: Provider) {
		return this.prisma.account.findFirst({
			where: {
				userId,
				provider,
			},
		});
	}
	async create(accountDto: CreateAccountDto) {
		return this.prisma.account.create({
			data: {
				userId: accountDto.userId,
				provider: accountDto.provider,
				providerAccountId: accountDto.providerAccountId,
				accessToken: accountDto.accessToken,
			},
		});
	}

	async update(accountId: number, accessToken: string) {
		return this.prisma.account.update({
			where: {
				id: accountId,
			},
			data: { accessToken },
		});
	}
}
