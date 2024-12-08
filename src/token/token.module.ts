import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { UserModule } from 'src/user/user.module';
import { TokenController } from './token.controller';
import { TokenService } from './token.service';

@Module({
	imports: [
		UserModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get('JWT_VERIFICATION_SECRET'),
			}),
		}),
	],
	controllers: [TokenController],
	providers: [TokenService, PrismaService],
	exports: [TokenService],
})
export class TokenModule {}