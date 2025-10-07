import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { FavoritesController, KahootFavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { FavoritesRepository } from './favorites.repo';

@Module({
  imports: [SharedModule],
  controllers: [FavoritesController, KahootFavoritesController],
  providers: [FavoritesService, FavoritesRepository],
})
export class FavoritesModule {}
