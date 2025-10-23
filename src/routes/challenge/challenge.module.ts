import { Module } from '@nestjs/common';
import { ChallengeController } from './challenge.controller';
import { ChallengeService } from './challenge.service';
import { ChallengeRepository } from './challenge.repo';
import { PrismaService } from 'src/shared/services/prisma.service';
import { OptionalAccessTokenGuard } from 'src/shared/guards/optional-access-token.guard';
import { ChallengeScheduler } from './challenge.scheduler';

@Module({
  controllers: [ChallengeController],
  providers: [ChallengeService, ChallengeRepository, PrismaService, OptionalAccessTokenGuard, ChallengeScheduler,],
  exports: [ChallengeService],
})
export class ChallengeModule {}
