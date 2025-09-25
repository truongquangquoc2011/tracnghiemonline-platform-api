import { BadRequestException } from '@nestjs/common';

export const InvalidObjectIdException = new BadRequestException({
  message: 'Error.InvalidObjectId',
  path: 'id',
});