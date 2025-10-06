import {
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';

export const FavoriteNotFoundException = new NotFoundException({
  message: 'Error.FavoriteNotFound',
  path: 'favorite',
});

export const CreateFavoriteFailedException = new BadRequestException({
  message: 'Error.CreateFavoriteFailed',
  path: 'favorite',
});

export const DeleteFavoriteFailedException = new UnprocessableEntityException({
  message: 'Error.DeleteFavoriteFailed',
  path: 'favorite',
});
