import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AccountModule } from './account/account.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma.service';
import { TokenCleanupService } from './token/token-cleanup.service';
import { TokenModule } from './token/token.module';
import { UserModule } from './user/user.module';
import { MailModule } from './mail/mail.module';

@Module({
	imports: [
		ConfigModule.forRoot(),
		AuthModule,
		UserModule,
		AccountModule,
		TokenModule,
		ScheduleModule.forRoot(),
		MailModule,
	],
	controllers: [AppController],
	providers: [AppService, TokenCleanupService, PrismaService],
})
export class AppModule {}
