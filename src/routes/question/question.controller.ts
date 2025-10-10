import { Auth } from 'src/shared/decorator/auth.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { QuestionService } from './question.service';
import { ActiveUser } from 'src/shared/decorator/active-user.decorator';
import {
  CreateQuestionBodyDTO,
  UpdateQuestionBodyDTO,
  ReorderQuestionsBodyDTO,
} from './dto/question.dto';
import { AuthTypes, ConditionGuard } from 'src/shared/constants/auth.constant';

// Chuẩn nhất
@Controller('kahoots/:kahootId/questions')
export class QuestionController {
  constructor(private readonly service: QuestionService) {}

  /**
   * Lấy chi tiết 1 câu hỏi
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get('/:id')
  getQuestion(
    @ActiveUser('userId') userId: string | undefined,
    @Param('kahootId') kahootId: string,
    @Param('id') id: string,
  ) {
    return this.service.getQuestion(userId, kahootId, id);
  }

  /**
   * Lấy danh sách câu hỏi của 1 kahoot
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get()
  listQuestions(
    @ActiveUser('userId') userId: string | undefined,
    @Param('kahootId') kahootId: string,
  ) {
    return this.service.listQuestions(userId, kahootId);
  }

  /**
   * Tạo mới câu hỏi trong kahoot
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post()
  createQuestion(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
    @Body() body: CreateQuestionBodyDTO,
  ) {
    return this.service.createQuestion(userId, kahootId, body);
  }

  /**
   * Reorder danh sách câu hỏi trong kahoot
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Patch('reorder')
  reorderQuestions(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
    @Body() body: ReorderQuestionsBodyDTO,
  ) {
    return this.service.reorderQuestions(userId, kahootId, body.order);
  }
  
  /**
   * Cập nhật câu hỏi trong kahoot
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Patch('/:id')
  updateQuestion(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
    @Param('id') id: string,
    @Body() body: UpdateQuestionBodyDTO,
  ) {
    return this.service.updateQuestion(userId, kahootId, id, body);
  }

  /**
   * Xoá (soft delete) câu hỏi trong kahoot
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Delete('/:id')
  deleteQuestion(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteQuestion(userId, kahootId, id);
  }
}
