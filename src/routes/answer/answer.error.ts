import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'

/**
 * Answer-related exceptions
 */

// Thrown when the answer with given ID is not found
export const AnswerNotFoundException = new NotFoundException({
  message: 'Thông báo lỗi! Câu trả lời không tồn tại',
  path: 'answerId',
})

// Thrown when creating a new answer fails
export const CreateAnswerFailedException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Tạo câu trả lời thất bại',
  path: 'answer',
})

// Thrown when updating an existing answer fails
export const UpdateAnswerFailedException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Cập nhật câu trả lời thất bại',
  path: 'answer',
})

// Thrown when deleting an answer fails
export const DeleteAnswerFailedException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Xoá câu trả lời thất bại',
  path: 'answerId',
})

// Thrown when trying to create an answer with duplicate orderIndex or duplicate content (if business rule applies)
export const DuplicateAnswerException = new ConflictException({
  message: 'Thông báo lỗi! Câu trả lời bị trùng lặp',
  path: 'answer',
})
