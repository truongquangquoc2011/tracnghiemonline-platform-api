import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'

// Kahoot không tìm thấy
export const KahootNotFoundException = new NotFoundException({
  message: 'Thông báo lỗi! Kahoot không tồn tại',
  path: 'kahootId',
})

// Không có quyền thao tác kahoot (không phải owner / không đủ role)
export const KahootForbiddenException = new ForbiddenException('Error.KahootForbidden')

// Publish: chưa có câu hỏi
export const PublishRequireQuestionException = new BadRequestException({
  message: 'Thông báo lỗi! Kahoot phải có ít nhất 1 câu hỏi để xuất bản',
  path: 'questions',
})

// Publish: mỗi câu hỏi phải có ≥ 2 đáp án
export const PublishRequire2AnswersException = (questionIdOrText: string) =>
  new BadRequestException({
    message: 'Thông báo lỗi! Mỗi câu hỏi phải có ít nhất 2 đáp án',
    path: `question:${questionIdOrText}`,
  })

// Publish: mỗi câu hỏi phải có ≥ 1 đáp án đúng
export const PublishRequire1CorrectException = (questionIdOrText: string) =>
  new BadRequestException({
    message: 'Thông báo lỗi! Mỗi câu hỏi phải có ít nhất 1 đáp án đúng',
    path: `question:${questionIdOrText}`,
  })

// Duplicate: nguồn không cho phép nhân bản
export const DuplicateForbiddenException = new ForbiddenException('Error.Duplicate.Forbidden')

// Tag: không hợp lệ danh sách names
export const InvalidTagNamesException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Danh sách tag không hợp lệ',
  path: 'names',
})

// Tag: liên kết tag bị trùng
export const TagLinkAlreadyExistsException = new ConflictException({
  message: 'Thông báo lỗi! Kahoot đã được gắn tag này',
  path: 'tag',
})

export const InvalidImportFileException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! File nhập không hợp lệ',
  path: 'file',
})

export const QuestionInvalidException = (index: number, reason: string) =>
  new BadRequestException({
    message: `Câu hỏi không hợp lệ[${index}]: ${reason}`,
    path: 'questions',
  })

export const AnswerInvalidException = (qIndex: number, reason: string) =>
  new BadRequestException({
    message: `Đáp án không hợp lệ[Q${qIndex}]: ${reason}`,
    path: 'answers',
  })

  // MusicTheme: file id không tồn tại hoặc không phải THEME_MUSIC
export const MusicThemeNotFoundException = new BadRequestException({
  message: 'Thông báo lỗi! Nhạc nền (musicTheme) không tồn tại hoặc không hợp lệ',
  path: 'musicTheme',
});