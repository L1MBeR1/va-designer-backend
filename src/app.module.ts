import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AccountModule } from './account/account.module';
import { TokenModule } from './token/token.module';

@Module({
	imports: [ConfigModule.forRoot(), AuthModule, UserModule, AccountModule, TokenModule],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
