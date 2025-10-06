import { Injectable } from '@nestjs/common';
import { CommentsRepository } from './comments.repo';
import { isUniqueConstraintPrismaError } from 'src/shared/helper';
import {
  CreateCommentBodyDTO,
  ListCommentsQueryDTO,
  UpdateCommentBodyDTO,
} from './dto/comments.dto';
import {
  CreateCommentFailedException,
  CommentNotFoundException,
  UpdateCommentFailedException,
  DeleteCommentFailedException,
  ListCommentsFailedException,
} from './comments.error';

@Injectable()
export class CommentsService {
  constructor(private readonly repo: CommentsRepository) {}

  // CREATE
  async create(kahootId: string, body: CreateCommentBodyDTO, currentUserId: string) {
    try {
      const { content, parentId } = body;
      await this.repo.checkViewableOrThrow(kahootId, currentUserId);
      if (parentId) await this.repo.parentExistsInKahootOrThrow(parentId, kahootId);
      return await this.repo.create(kahootId, currentUserId, content, parentId);
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw CreateCommentFailedException;
       }
      throw error;
    }
  }

   // UPDATE (only owner)
  async update(kahootId: string, commentId: string, body: UpdateCommentBodyDTO, currentUserId: string) {
    try {
      const found = await this.repo.findByIdOrThrow(commentId);

      // comment phải thuộc kahoot hiện tại
      if (found.kahootId !== kahootId) {
        // Ẩn resource → 404
        throw CommentNotFoundException;
      }

      await this.repo.checkViewableOrThrow(found.kahootId, currentUserId);
      await this.repo.assertOwnerOrThrow(found.userId, currentUserId);

      return await this.repo.updateContent(commentId, body.content);
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw UpdateCommentFailedException;
      }
      throw error;
    }
  }

  // DELETE (hard delete, only owner)
  async remove(kahootId: string, commentId: string, currentUserId: string) {
    try {
      const found = await this.repo.findByIdOrThrow(commentId);

      if (found.kahootId !== kahootId) {
        throw CommentNotFoundException;
      }

      await this.repo.checkViewableOrThrow(found.kahootId, currentUserId);
      await this.repo.assertOwnerOrThrow(found.userId, currentUserId);

      await this.repo.hardDelete(commentId);
      return { success: true };
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw DeleteCommentFailedException;
      }
      throw error;
    }
  }

  // LIST
  async list(kahootId: string, query: ListCommentsQueryDTO, currentUserId: string) {
    try {
      const { parentId, page = 1, limit = 20, sort = 'newest' } = query;

      await this.repo.checkViewableOrThrow(kahootId, currentUserId);
      if (parentId) await this.repo.parentExistsInKahootOrThrow(parentId, kahootId);

      return await this.repo.list(kahootId, parentId ?? null, page, limit, sort);
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw ListCommentsFailedException;
      }
      throw error;
    }
  }
}
