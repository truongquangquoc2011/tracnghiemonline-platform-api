import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { AnswerService } from './answer.service';
import { ActiveUser } from 'src/shared/decorator/active-user.decorator';
import {
  CreateAnswerBodyDTO,
  UpdateAnswerBodyDTO,
} from './dto/answer.dto';

@Controller('kahoots')
export class AnswerController {
  constructor(private readonly service: AnswerService) {}

  // Lấy danh sách câu trả lời của câu hỏi
  @Get('questions/:questionId/answers')
  listAnswers(@ActiveUser('userId') userId: string, @Param('questionId') questionId: string) {
    return this.service.listAnswers(userId, questionId)
  }

  // Tạo câu trả lời cho câu hỏi
  @Post('questions/:questionId/answers')
  createAnswer(@ActiveUser('userId') userId: string, @Param('questionId') questionId: string, @Body() body: CreateAnswerBodyDTO) {
    return this.service.createAnswer(userId, questionId, body)
  }

  //Cập nhật cho câu trả lời
  @Patch('questions/:questionId/answers/:id')
  updateAnswer(@ActiveUser('userId') userId: string, @Param('id') id: string, @Body() body: UpdateAnswerBodyDTO) {
    return this.service.updateAnswer(userId, id, body)
  }

  // Xoá câu trả lời
  @Delete('questions/:questionId/answers/:id')
  deleteAnswer(@ActiveUser('userId') userId: string, @Param('id') id: string) {
    return this.service.deleteAnswer(userId, id)
  }
}
