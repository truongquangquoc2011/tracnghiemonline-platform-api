import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { QuestionService } from './question.service';
import { ActiveUser } from 'src/shared/decorator/active-user.decorator';
import {
  CreateQuestionBodyDTO,
  UpdateQuestionBodyDTO,
  ReorderQuestionsBodyDTO,
} from './dto/question.dto';

@Controller('kahoots')
export class QuestionController {
  constructor(private readonly service: QuestionService) {}

  // Lấy tất cả câu hỏi
    @Get('questions/:id')
    getQuestion(@Param('id') id: string) {
      return this.service.getQuestion(id);
    }

  // Lấy danh sách câu hỏi của kahoot
    @Get(':kahootId/questions')
    listQuestions(
      @Param('kahootId') kahootId: string,
    ) {
      return this.service.listQuestions(kahootId);
    }

    // Tạo, cập nhật, xoá, sắp xếp câu hỏi
    @Post(':kahootId/questions')
    createQuestion(@ActiveUser('userId') userId: string, @Param('kahootId') kahootId: string, @Body() body: CreateQuestionBodyDTO) {
      return this.service.createQuestion(userId, kahootId, body)
    }

    // Cập nhật câu hỏi
    @Patch(':kahootId/questions/:id')
    updateQuestion(@ActiveUser('userId') userId: string, @Param('id') id: string, @Body() body: UpdateQuestionBodyDTO) {
      return this.service.updateQuestion(userId, id, body)
    }

    // Xoá câu hỏi
    @Delete(':kahootId/questions/:id')
    deleteQuestion(@ActiveUser('userId') userId: string, @Param('id') id: string) {
      return this.service.deleteQuestion(userId, id)
    }

    // Sắp xếp câu hỏi
    @Patch(':kahootId/questions/reorder')
    reorder(@ActiveUser('userId') userId: string, @Param('kahootId') kahootId: string, @Body() body: ReorderQuestionsBodyDTO) {
      return this.service.reorderQuestions(userId, kahootId, body.order)
    }
}
