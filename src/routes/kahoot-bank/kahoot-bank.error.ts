import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'

// Kahoot không tìm thấy
export const KahootNotFoundException = new NotFoundException({
  message: 'Error.KahootNotFound',
  path: 'kahootId',
})

// Không có quyền thao tác kahoot (không phải owner / không đủ role)
export const KahootForbiddenException = new ForbiddenException('Error.KahootForbidden')

// Publish: chưa có câu hỏi
export const PublishRequireQuestionException = new BadRequestException({
  message: 'Error.Publish.RequireQuestion',
  path: 'questions',
})

// Publish: mỗi câu hỏi phải có ≥ 2 đáp án
export const PublishRequire2AnswersException = (questionIdOrText: string) =>
  new BadRequestException({
    message: 'Error.Publish.Require2Answers',
    path: `question:${questionIdOrText}`,
  })

// Publish: mỗi câu hỏi phải có ≥ 1 đáp án đúng
export const PublishRequire1CorrectException = (questionIdOrText: string) =>
  new BadRequestException({
    message: 'Error.Publish.Require1Correct',
    path: `question:${questionIdOrText}`,
  })

// Duplicate: nguồn không cho phép nhân bản
export const DuplicateForbiddenException = new ForbiddenException('Error.Duplicate.Forbidden')

// Tag: không hợp lệ danh sách names
export const InvalidTagNamesException = new UnprocessableEntityException({
  message: 'Error.Tag.InvalidNames',
  path: 'names',
})

// Tag: liên kết tag bị trùng
export const TagLinkAlreadyExistsException = new ConflictException({
  message: 'Error.Tag.LinkAlreadyExists',
  path: 'tag',
})

export const InvalidImportFileException = new UnprocessableEntityException({
  message: 'Error.InvalidImportFile',
  path: 'file',
})

export const QuestionInvalidException = (index: number, reason: string) =>
  new BadRequestException({
    message: `Error.QuestionInvalid[${index}]: ${reason}`,
    path: 'questions',
  })

export const AnswerInvalidException = (qIndex: number, reason: string) =>
  new BadRequestException({
    message: `Error.AnswerInvalid[Q${qIndex}]: ${reason}`,
    path: 'answers',
  })
