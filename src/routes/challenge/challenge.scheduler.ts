import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import { ChallengeRepository } from './challenge.repo';

@Injectable()
export class ChallengeScheduler {
  private readonly logger = new Logger(ChallengeScheduler.name);

  constructor(private readonly repo: ChallengeRepository) {}

  // Chạy sau khi app khởi động để dọn 1 lần (phòng app down lâu)
  @Timeout(10_000)
  async initialSweep() {
    const n = await this.repo.bulkCloseExpired();
    if (n > 0) this.logger.log(`Initial sweep closed ${n} expired challenges`);
  }

  // Cron: mỗi phút đóng challenge quá hạn
  @Cron('*/1 * * * * *')
  async closeExpired() {
    const n = await this.repo.bulkCloseExpired();
    if (n > 0) this.logger.log(`Closed ${n} expired challenges`);
  }
}
  