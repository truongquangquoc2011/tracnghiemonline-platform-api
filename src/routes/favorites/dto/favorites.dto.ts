import { createZodDto } from 'nestjs-zod';
import {
  ListFavoritesQuerySchema,
  FavoriteParamSchema,
} from '../favorites.model';

export class FavoritesListQueryDTO extends createZodDto(ListFavoritesQuerySchema) {}
export class FavoriteParamDTO extends createZodDto(FavoriteParamSchema) {}
