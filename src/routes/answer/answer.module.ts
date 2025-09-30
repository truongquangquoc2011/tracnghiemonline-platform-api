import { Module } from '@nestjs/common';
import { AnswerController } from './answer.controller';
import { AnswerService } from './answer.service';
import { SharedModule } from 'src/shared/shared.module';
import { AnswerRepository } from './answer.repo';
@Module({
  imports: [SharedModule],
  controllers: [AnswerController],
  providers: [AnswerService, AnswerRepository],
})
export class AnswerModule {}
