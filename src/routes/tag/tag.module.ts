import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';
import { KahootBankModule } from '../kahoot-bank/kahoot-bank.module';
import { TagRepository } from './tag.repo';
@Module({
  imports: [KahootBankModule, SharedModule, KahootBankModule],
  controllers: [TagController],
  providers: [TagService, TagRepository],
  exports: [TagService],
})
export class TagModule {}
