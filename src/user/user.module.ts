import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TokenModule } from 'src/token/token.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
	imports: [TokenModule],
	controllers: [UserController],
	providers: [UserService, PrismaService],
	exports: [UserService],
})
export class UserModule {}
