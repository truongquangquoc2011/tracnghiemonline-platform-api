import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import path from 'path';

export const CommentNotFoundException = new NotFoundException({
  message: 'Thông báo lỗi! Bình luận không tồn tại',
  path: 'comment',
});

export const CommentForbiddenException = new ForbiddenException({
  message: 'Thông báo lỗi! Bạn không có quyền thực hiện hành động này',
  path: 'comment',
});

export const CommentBadParentException = new BadRequestException({
  message: 'Thông báo lỗi! ParentId không hợp lệ',
  path: 'parentId',
});

export const KahootNotFoundOrPrivateException = new NotFoundException({
  message: 'Thông báo lỗi! Kahoot không tồn tại hoặc là riêng tư',
  path: 'kahoot',
});

export const CreateCommentFailedException = new BadRequestException({
  message: 'Thông báo lỗi! Tạo bình luận thất bại',
  path: 'comment',
});

export const UpdateCommentFailedException = new BadRequestException({
  message: 'Thông báo lỗi! Cập nhật bình luận thất bại',
  path: 'comment',
});
export const DeleteCommentFailedException = new BadRequestException({
  message: 'Thông báo lỗi! Xoá bình luận thất bại',
  path: 'comment',
});
export const ListCommentsFailedException = new BadRequestException({
  message: 'Thông báo lỗi! Lấy danh sách bình luận thất bại',
  path: 'comment',
});