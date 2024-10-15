import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
	controllers: [AccountController],
	providers: [AccountService, PrismaService],
	exports: [AccountService],
})
export class AccountModule {}
