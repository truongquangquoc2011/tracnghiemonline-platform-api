import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import {
  CreateCommentBodyDTO,
  UpdateCommentBodyDTO,
  ListCommentsQueryDTO,
  KahootParamDTO,
} from './dto/comments.dto';
import { Auth } from 'src/shared/decorator/auth.decorator';
import { ActiveUser } from 'src/shared/decorator/active-user.decorator';
import { AuthTypes, ConditionGuard } from 'src/shared/constants/auth.constant';

@Controller('kahoots/:kahoot_id/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /** -------------------- CREATE COMMENT -------------------- **/
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post()
  @HttpCode(HttpStatus.OK)
  async create(
    @Param() p: KahootParamDTO,
    @Body() body: CreateCommentBodyDTO,
    @ActiveUser('userId') userId: string,
  ) {
    return this.commentsService.create(p.kahoot_id, body, userId);
  }

  /** -------------------- UPDATE COMMENT -------------------- **/
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Put(':comment_id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param() p: KahootParamDTO,
    @Param('comment_id') commentId: string,
    @Body() body: UpdateCommentBodyDTO,
    @ActiveUser('userId') userId: string,
  ) {
    return this.commentsService.update(p.kahoot_id, commentId, body, userId);
  }

  /** -------------------- DELETE COMMENT -------------------- **/
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Delete(':comment_id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param() p: KahootParamDTO,
    @Param('comment_id') commentId: string,
    @ActiveUser('userId') userId: string,
  ) {
    return this.commentsService.remove(p.kahoot_id, commentId, userId);
  }

  /** -------------------- LIST COMMENTS -------------------- **/
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @Param() p: KahootParamDTO,
    @Query() q: ListCommentsQueryDTO,
    @ActiveUser('userId') userId: string,
  ) {
    return this.commentsService.list(p.kahoot_id, q, userId);
  }
}
