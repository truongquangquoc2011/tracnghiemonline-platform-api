import { Module } from '@nestjs/common'
import { KahootBankController } from './kahoot-bank.controller'
import { KahootBankService } from './kahoot-bank.service'
import { KahootBankRepository } from './kahoot-bank.repo'
import { QuestionRepository } from '../question/question.repo'
import { AnswerRepository } from '../answer/answer.repo'
import { PrismaService } from 'src/shared/services/prisma.service';
import { SharedModule } from 'src/shared/shared.module';
import { QuestionModule } from '../question/question.module';
import { AnswerModule } from '../answer/answer.module';
@Module({
  imports: [
    SharedModule,
    QuestionModule,   // để inject QuestionRepository trong service
    AnswerModule,     // để inject AnswerRepository trong service
  ],
  controllers: [KahootBankController],
  providers: [PrismaService, KahootBankService, KahootBankRepository, QuestionRepository, AnswerRepository,],
  exports: [KahootBankRepository, KahootBankService],
})
export class KahootBankModule {}
