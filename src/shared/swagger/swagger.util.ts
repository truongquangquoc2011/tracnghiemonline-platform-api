import { HttpStatus } from '@nestjs/common';
import { ApiResponseOptions } from '@nestjs/swagger';
import { MESSAGES } from '../constants/message.constant';
import dayjs from 'dayjs';

export const unauthorizedResponse = (
  description = 'Unauthorized',
  message = 'Unauthorized access',
): ApiResponseOptions => ({
  status: HttpStatus.UNAUTHORIZED,
  description,
  schema: {
    example: {
      statusCode: HttpStatus.UNAUTHORIZED,
      message,
      data: null,
      dateTime: dayjs().format('DD-MM-YYYYTHH:mm:ssSSS'),
    },
  },
});

export const badRequestResponse = (
  description = 'Bad Request',
  message = 'Invalid request data',
): ApiResponseOptions => ({
  status: HttpStatus.BAD_REQUEST,
  description,
  schema: {
    example: {
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      data: null,
      dateTime: dayjs().format('DD-MM-YYYYTHH:mm:ssSSS'),
    },
  },
});

export const forbiddenResponse = (
  description = 'Forbidden',
): ApiResponseOptions => ({
  status: HttpStatus.FORBIDDEN,
  description,
  schema: {
    example: {
      statusCode: HttpStatus.FORBIDDEN,
      message: 'Access forbidden',
      data: null,
      dateTime: dayjs().format('DD-MM-YYYYTHH:mm:ssSSS'),
    },
  },
});

export const notFoundResponse = (
  description = 'Not Found',
  message = 'Resource not found',
): ApiResponseOptions => ({
  status: HttpStatus.NOT_FOUND,
  description,
  schema: {
    example: {
      statusCode: HttpStatus.NOT_FOUND,
      message,
      data: null,
      dateTime: dayjs().format('DD-MM-YYYYTHH:mm:ssSSS'),
    },
  },
});

export const internalServerErrorResponse = (
  description = 'Internal Server Error',
): ApiResponseOptions => ({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description,
  schema: {
    example: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      dateTime: dayjs().format('DD-MM-YYYYTHH:mm:ssSSS'),
    },
  },
});

export const userAuthResponse = (
  description = MESSAGES.SUCCESS_MESSAGES.LOGIN,
): ApiResponseOptions => ({
  status: HttpStatus.CREATED,
  description,
  schema: {
    example: {
      statusCode: HttpStatus.CREATED,
      message: description,
      data: {
        id: '656b0bbd3b0e9defe34fca1a',
        email: 'john@gmail.com',
        access_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjRiZTBhZDJlNDNkMjQ2NDM5NGZlZWRiIiwidG9rZW5fdHlwZSI6MCwidmVyaWZ5IjoxLCJpYXQiOjE2OTEzODMyMjYsImV4cCI6MTY5MTQ2OTYyNn0.HTLX20cB7_z0c9c8FDg3MIx6RJEELHHlmJNZa94ku-o',
        refresh_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjRiZTBhZDJlNDNkMjQ2NDM5NGZlZWRiIiwidG9rZW5fdHlwZSI6MCwidmVyaWZ5IjoxLCJpYXQiOjE2OTEzODMyMjYsImV4cCI6MTY5MTQ2OTYyNn0.HTLX20cB7_z0c9c8FDg3MIx6RJEELHHlmJNZa94ku-o',
      },
      dateTime: dayjs().format('DD-MM-YYYYTHH:mm:ssSSS'),
    },
  },
});

export const uploadImageResponse = (
  description = MESSAGES.SUCCESS_MESSAGES.USER.UPLOAD_IMAGE,
): ApiResponseOptions => ({
  status: HttpStatus.CREATED,
  description,
  schema: {
    example: {
      statusCode: HttpStatus.CREATED,
      message: description,
      data: {
        url: 'https://res.cloudinary.com/demo/image/upload/v161616616/avatar.jpg',
      },
      dateTime: dayjs().format('DD-MM-YYYYTHH:mm:ssSSS'),
    },
  },
});
