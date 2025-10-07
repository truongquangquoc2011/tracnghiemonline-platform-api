import {
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common'

// Khi không tìm thấy câu hỏi
export const QuestionNotFoundException = new NotFoundException({
  message: 'Thông báo lỗi! Câu hỏi không tồn tại',
  path: 'questionId',
})

// Khi tạo câu hỏi thất bại
export const CreateQuestionFailedException = new BadRequestException({
  message: 'Thông báo lỗi! Tạo câu hỏi thất bại',
  path: 'question',
})

// Khi cập nhật câu hỏi thất bại
export const UpdateQuestionFailedException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Cập nhật câu hỏi thất bại',
  path: 'question',
})

// Khi xoá câu hỏi thất bại
export const DeleteQuestionFailedException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Xoá câu hỏi thất bại',
  path: 'questionId',
})

// Khi reorder thất bại
export const ReorderQuestionFailedException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Sắp xếp lại câu hỏi thất bại',
  path: 'questions',
})
