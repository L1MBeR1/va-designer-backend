import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TokenCleanupService {
	private readonly logger = new Logger(TokenCleanupService.name);

	constructor(private readonly prisma: PrismaService) {}

	@Cron(CronExpression.EVERY_WEEK)
	async deleteExpiredTokens() {
		this.logger.log('Starting token cleanup process...');

		try {
			const result = await this.prisma.verificationToken.deleteMany({
				where: {
					expires: {
						lte: new Date(),
					},
				},
			});

			this.logger.log(`Deleted ${result.count} expired tokens.`);
		} catch (error) {
			this.logger.error('Error during token cleanup:', error);
		}
	}
}
