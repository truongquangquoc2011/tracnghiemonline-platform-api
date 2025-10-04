import {
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common'

// Khi không tìm thấy câu hỏi
export const QuestionNotFoundException = new NotFoundException({
  message: 'Error.QuestionNotFound',
  path: 'questionId',
})

// Khi tạo câu hỏi thất bại
export const CreateQuestionFailedException = new BadRequestException({
  message: 'Error.CreateQuestionFailed',
  path: 'question',
})

// Khi cập nhật câu hỏi thất bại
export const UpdateQuestionFailedException = new UnprocessableEntityException({
  message: 'Error.UpdateQuestionFailed',
  path: 'question',
})

// Khi xoá câu hỏi thất bại
export const DeleteQuestionFailedException = new UnprocessableEntityException({
  message: 'Error.DeleteQuestionFailed',
  path: 'questionId',
})

// Khi reorder thất bại
export const ReorderQuestionFailedException = new UnprocessableEntityException({
  message: 'Error.ReorderQuestionFailed',
  path: 'questions',
})
