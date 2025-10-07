import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { KahootVisibility, Prisma } from '@prisma/client'; // <-- thêm Prisma
import {
  CommentBadParentException,
  CommentForbiddenException,
  CommentNotFoundException,
  KahootNotFoundOrPrivateException,
} from './comments.error';

  export type CommentRow = Prisma.CommentGetPayload<{
  select: {
    id: true;
    kahootId: true;
    userId: true;
    content: true;
    parentId: true;
    createdAt: true;
    user: { select: { id: true } };
  };
}>;

export type CommentsList = {
  items: Array<
    Omit<CommentRow, 'createdAt'> & { createdAt: string }
  >;
  total: number;
  page: number;
  limit: number;
};

@Injectable()
export class CommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async checkViewableOrThrow(kahootId: string, userId: string) {
    const kahoot = await this.prisma.kahoot.findUnique({
      where: { id: kahootId },
      select: { id: true, ownerId: true, visibility: true },
    });
    if (!kahoot) throw KahootNotFoundOrPrivateException;
    if (kahoot.visibility === KahootVisibility.private && kahoot.ownerId !== userId) {
      throw KahootNotFoundOrPrivateException;
    }
    return kahoot;
  }

  async assertOwnerOrThrow(commentUserId: string, currentUserId: string) {
    if (commentUserId !== currentUserId) throw CommentForbiddenException;
  }

  async parentExistsInKahootOrThrow(parentId: string, kahootId: string) {
    const p = await this.prisma.comment.findFirst({
      where: { id: parentId, kahootId },
      select: { id: true },
    });
    if (!p) throw CommentBadParentException;
  }

  async create(kahootId: string, userId: string, content: string, parentId?: string): Promise<CommentRow> {
    return this.prisma.comment.create({
      data: { kahootId, userId, content, parentId: parentId ?? null },
      select: {
        id: true,
        kahootId: true,
        userId: true,
        content: true,
        parentId: true,
        createdAt: true,
        // chỉ chọn field chắc chắn có trong User
        user: { select: { id: true /* , email: true */ } },
      },
    });
  }

  async findByIdOrThrow(commentId: string): Promise<{
  id: string; kahootId: string; userId: string; content: string; createdAt: Date; parentId: string | null;
}>  {
    const c = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, kahootId: true, userId: true, content: true, createdAt: true, parentId: true },
    });
    if (!c) throw CommentNotFoundException;
    return c;
  }

  async updateContent(commentId: string, content: string): Promise<CommentRow> {
    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content },
      select: {
        id: true,
        kahootId: true,
        userId: true,
        content: true,
        parentId: true,
        createdAt: true,
        user: { select: { id: true /* , email: true */ } },
      },
    });
  }

  async hardDelete(commentId: string): Promise<void> {
    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  async list(
    kahootId: string,
    parentId: string | null,
    page = 1,
    limit = 20,
    sort: 'newest' | 'oldest' = 'newest',
  ): Promise<CommentsList> {
    // dùng Prisma.SortOrder
    const orderBy: Prisma.CommentOrderByWithRelationInput = {
      createdAt: (sort === 'oldest' ? 'asc' : 'desc') as Prisma.SortOrder,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where: { kahootId, parentId },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          kahootId: true,
          userId: true,
          content: true,
          parentId: true,
          createdAt: true,
          user: { select: { id: true /* , email: true */ } },
        },
      }),
      this.prisma.comment.count({ where: { kahootId, parentId } }),
    ]);

    const norm = items.map((it) => ({
      ...it,
      createdAt: it.createdAt.toISOString(),
    }));
    return { items: norm, total, page, limit };
  }
}
