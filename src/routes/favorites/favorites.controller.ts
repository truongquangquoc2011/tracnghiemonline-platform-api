import { Controller, Get, Post, Delete, Query, Param } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { Auth } from 'src/shared/decorator/auth.decorator';
import { ActiveUser } from 'src/shared/decorator/active-user.decorator';
import { AuthTypes, ConditionGuard } from 'src/shared/constants/auth.constant';
import { FavoriteListResponse } from './favorites.model';
import { FavoritesListQueryDTO, FavoriteParamDTO } from './dto/favorites.dto';
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get()
  async listMyFavorites(
    @ActiveUser('userId') userId: string,
    @Query() q: FavoritesListQueryDTO,
  ): Promise<FavoriteListResponse> {
    return this.service.list(userId, q);
  }
}

@Controller('kahoots/:kahootId/favorites')
export class KahootFavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post()
  addFavorite(
    @ActiveUser('userId') userId: string,
    @Param() params: FavoriteParamDTO,
  ): Promise<{ status: 'added' | 'removed'; userId: string; kahootId: string; createdAt?: Date }> {
    return this.service.add(userId, params.kahootId);
  }

  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Delete()
  removeFavorite(
    @ActiveUser('userId') userId: string,
    @Param() params: FavoriteParamDTO,
  ): Promise<{ ok: true }> {
    return this.service.remove(userId, params.kahootId);
  }
}
