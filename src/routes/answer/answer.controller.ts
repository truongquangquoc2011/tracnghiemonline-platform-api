import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { AnswerService } from './answer.service';
import { ActiveUser } from 'src/shared/decorator/active-user.decorator';
import { Auth } from 'src/shared/decorator/auth.decorator';
import { AuthTypes, ConditionGuard } from 'src/shared/constants/auth.constant';
import {
  CreateAnswerBodyDTO,
  UpdateAnswerBodyDTO,
} from './dto/answer.dto';

@Controller('kahoots/:kahootId/questions/:questionId/answers')
export class AnswerController {
  constructor(private readonly service: AnswerService) {}

  // Lấy danh sách câu trả lời của câu hỏi
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get()
  listAnswers(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
    @Param('questionId') questionId: string
  ) {
    return this.service.listAnswers(userId, kahootId, questionId)
  }

  // Tạo câu trả lời cho câu hỏi
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post()
  createAnswer(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
    @Param('questionId') questionId: string,
    @Body() body: CreateAnswerBodyDTO,
  ) {
    return this.service.createAnswer(userId, kahootId, questionId, body);
  }

  //Cập nhật cho câu trả lời
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Patch('/:id')
  updateAnswer(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
    @Param('questionId') questionId: string,
    @Param('id') id: string,
    @Body() body: UpdateAnswerBodyDTO,
  ) {
    return this.service.updateAnswer(userId, kahootId, questionId, id, body);
  }

  // Xoá câu trả lời
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Delete('/:id')
  deleteAnswer(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
    @Param('questionId') questionId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteAnswer(userId, kahootId, questionId, id);
  }
}
