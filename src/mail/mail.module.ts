import { Module } from '@nestjs/common';
import { TokenModule } from 'src/token/token.module';
import { UserModule } from 'src/user/user.module';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

@Module({
	imports: [UserModule, TokenModule],
	controllers: [MailController],
	providers: [MailService],
})
export class MailModule {}
