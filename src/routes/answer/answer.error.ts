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
  message: 'Error.AnswerNotFound',
  path: 'answerId',
})

// Thrown when creating a new answer fails
export const CreateAnswerFailedException = new UnprocessableEntityException({
  message: 'Error.CreateAnswerFailed',
  path: 'answer',
})

// Thrown when updating an existing answer fails
export const UpdateAnswerFailedException = new UnprocessableEntityException({
  message: 'Error.UpdateAnswerFailed',
  path: 'answer',
})

// Thrown when deleting an answer fails
export const DeleteAnswerFailedException = new UnprocessableEntityException({
  message: 'Error.DeleteAnswerFailed',
  path: 'answerId',
})

// Thrown when trying to create an answer with duplicate orderIndex or duplicate content (if business rule applies)
export const DuplicateAnswerException = new ConflictException({
  message: 'Error.DuplicateAnswer',
  path: 'answer',
})
