import { Injectable } from '@nestjs/common';
import { FavoritesRepository } from './favorites.repo';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ListFavoritesQueryDto, FavoriteListResponse } from './favorites.model';
import { UserNotFoundException } from 'src/shared/constants/file-error.constant'; 

@Injectable()
export class FavoritesService {
  constructor(
    private readonly repo: FavoritesRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async assertUserExists(userId: string): Promise<void> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!u) throw UserNotFoundException;
  }

  list(userId: string, q: ListFavoritesQueryDto): Promise<FavoriteListResponse> {
    return this.repo.listFavorites(userId, q.page, q.limit, q.sort);
  }

async add(userId: string, kahootId: string): Promise<{ status: 'added' | 'removed'; userId: string; kahootId: string; createdAt?: Date }> {
  await this.assertUserExists(userId);
  return this.repo.toggleFavorite(userId, kahootId);
}

  async remove(userId: string, kahootId: string): Promise<{ ok: true }> {
    await this.assertUserExists(userId);
    return this.repo.removeFavorite(userId, kahootId);
  }
}
