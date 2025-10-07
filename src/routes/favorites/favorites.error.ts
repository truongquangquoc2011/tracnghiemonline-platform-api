import {
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';

export const FavoriteNotFoundException = new NotFoundException({
  message: 'Thông báo lỗi! Kahoot không tồn tại',
  path: 'favorite',
});

export const CreateFavoriteFailedException = new BadRequestException({
  message: 'Thông báo lỗi! Tạo Kahoot yêu thích thất bại',
  path: 'favorite',
});

export const DeleteFavoriteFailedException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Xoá Kahoot yêu thích thất bại',
  path: 'favorite',
});
