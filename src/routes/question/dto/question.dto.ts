import { createZodDto } from 'nestjs-zod';
import {
  CreateQuestionBodySchema,
  UpdateQuestionBodySchema,
  ReorderQuestionsBodySchema,
} from '../question.model';

export class CreateQuestionBodyDTO extends createZodDto(CreateQuestionBodySchema) {}
export class UpdateQuestionBodyDTO extends createZodDto(UpdateQuestionBodySchema) {}
export class ReorderQuestionsBodyDTO extends createZodDto(ReorderQuestionsBodySchema) {}
