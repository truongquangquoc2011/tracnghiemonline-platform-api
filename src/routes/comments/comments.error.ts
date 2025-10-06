import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import path from 'path';

export const CommentNotFoundException = new NotFoundException({
  message: 'Error.CommentNotFound',
  path: 'comment',
});

export const CommentForbiddenException = new ForbiddenException({
  message: 'Error.CommentForbidden',
  path: 'comment',
});

export const CommentBadParentException = new BadRequestException({
  message: 'Error.CommentBadParent',
  path: 'parentId',
});

export const KahootNotFoundOrPrivateException = new NotFoundException({
  message: 'Error.KahootNotFound',
  path: 'kahoot',
});

export const CreateCommentFailedException = new BadRequestException({
  message: 'Error.CreateCommentFailed',
  path: 'comment',
});

export const UpdateCommentFailedException = new BadRequestException({
  message: 'Error.UpdateCommentFailed',
  path: 'comment',
});
export const DeleteCommentFailedException = new BadRequestException({
  message: 'Error.DeleteCommentFailed',
  path: 'comment',
});
export const ListCommentsFailedException = new BadRequestException({
  message: 'Error.ListCommentsFailed',
  path: 'comment',
});