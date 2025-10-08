import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { isUniqueConstraintPrismaError } from 'src/shared/helper';
import {
  CreateFavoriteFailedException,
  DeleteFavoriteFailedException,
  FavoriteNotFoundException,
  KahootNotFoundOrPrivateException
} from './favorites.error';
import { Prisma, KahootVisibility } from '@prisma/client';
import { FavoriteListResponse } from './favorites.model';

@Injectable()
export class FavoritesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Kiểm tra kahoot có tồn tại
  async checkViewableOrThrow(kahootId: string, userId: string) {
    const kahoot = await this.prisma.kahoot.findUnique({
      where: { id: kahootId },
      select: { id: true, ownerId: true, visibility: true },
    });
    if (!kahoot) {
      throw KahootNotFoundOrPrivateException;
    }
    if (kahoot.visibility === KahootVisibility.private && kahoot.ownerId !== userId) {
      throw KahootNotFoundOrPrivateException;;
    }
    return kahoot;
  }

  // Kiểm tra đã favorite chưa, nếu chưa thì ném lỗi
  private async assertFavoritedOrThrow(kahootId: string, userId: string) {
    const fav = await this.prisma.favorite.findUnique({
      where: { userId_kahootId: { userId, kahootId } },
      select: { userId: true, kahootId: true },
    });
    if (!fav) throw FavoriteNotFoundException;
    return fav;
  }

  async listFavorites(
    userId: string,
    page = 1,
    limit = 20,
    sort: 'newest' | 'oldest' = 'newest',
  ): Promise<FavoriteListResponse> {
    // Phòng thủ: đảm bảo không NaN
    const safePage  = Number.isFinite(Number(page))  && Number(page)  > 0 ? Number(page)  : 1;
    const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 20;
    const skip = (safePage - 1) * safeLimit;
    const take = safeLimit;

    const orderBy: Prisma.FavoriteOrderByWithRelationInput = {
      createdAt: sort === 'oldest' ? 'asc' : 'desc',
    };

    const whereFilter: Prisma.FavoriteWhereInput = {
      userId,
      OR: [
        { kahoot: { visibility: { in: [KahootVisibility.public, KahootVisibility.unlisted] } } },
        { kahoot: { ownerId: userId } },
      ],
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.favorite.findMany({
        where: whereFilter,
        include: {
          kahoot: {
            select: {
              id: true, title: true, description: true, coverImage: true,
              ownerId: true, visibility: true, createdAt: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      this.prisma.favorite.count({ where: whereFilter }),
    ]);

    return { page: safePage, limit: safeLimit, total, items };
  }

  async createFavorite(
    userId: string,
    kahootId: string,
  ): Promise<{ userId: string; kahootId: string; createdAt: Date }> {
    try {
      await this.checkViewableOrThrow(kahootId, userId);
      return await this.prisma.favorite.create({
        data: { user: { connect: { id: userId } }, kahoot: { connect: { id: kahootId } } },
        select: { userId: true, kahootId: true, createdAt: true },
      });
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw CreateFavoriteFailedException;
      }
      throw error;
    }
  }

  async removeFavorite(userId: string, kahootId: string): Promise<{ ok: true }> {
    try {
      await this.assertFavoritedOrThrow(kahootId, userId);
      await this.prisma.favorite.delete({
        where: { userId_kahootId: { userId, kahootId } },
      });
      return { ok: true };
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw DeleteFavoriteFailedException;
      }
      if (error === FavoriteNotFoundException) throw error;
      throw FavoriteNotFoundException;
    }
  }

  // Thêm/xoá favorite (toggle)
  async toggleFavorite(
    userId: string,
    kahootId: string,
  ): Promise<{ status: 'added' | 'removed'; userId: string; kahootId: string; createdAt?: Date }> {
    await this.checkViewableOrThrow(kahootId, userId);

    try {
      // TH1: chưa có -> tạo mới
      const created = await this.prisma.favorite.create({
        data: { user: { connect: { id: userId } }, kahoot: { connect: { id: kahootId } } },
        select: { userId: true, kahootId: true, createdAt: true },
      });
      return { status: 'added', ...created };
    } catch (error) {
      // TH2: đã có (đụng unique index) -> xoá để toggle
      if (isUniqueConstraintPrismaError(error)) {
        await this.prisma.favorite.delete({
          where: { userId_kahootId: { userId, kahootId } },
        });
        return { status: 'removed', userId, kahootId };
      }
      // còn lại: ném tiếp cho global filter xử lý
      throw error;
    }
  }
}
