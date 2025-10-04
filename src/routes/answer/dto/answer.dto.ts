import { createZodDto } from 'nestjs-zod';
import {
  CreateAnswerBodySchema,
  UpdateAnswerBodySchema,
} from '../answer.model';

export class CreateAnswerBodyDTO extends createZodDto(CreateAnswerBodySchema) {}
export class UpdateAnswerBodyDTO extends createZodDto(UpdateAnswerBodySchema) {}
