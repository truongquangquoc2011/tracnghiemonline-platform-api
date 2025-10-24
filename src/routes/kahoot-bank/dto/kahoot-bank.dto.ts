import { createZodDto } from 'nestjs-zod';
import {
  CreateKahootBodySchema,
  UpdateKahootBodySchema,
  ListKahootQuerySchema,
  KahootParamSchema,
  KahootReviewResponseSchema,
} from '../kahoot-bank.model';

export class ListKahootQueryDTO extends createZodDto(ListKahootQuerySchema) {}
export class CreateKahootBodyDTO extends createZodDto(CreateKahootBodySchema) {}
export class UpdateKahootBodyDTO extends createZodDto(UpdateKahootBodySchema) {}
/** ====== REVIEW KAHOOT ====== */
export class KahootParamDTO extends createZodDto(KahootParamSchema) {}
export class KahootReviewResponseDTO extends createZodDto(KahootReviewResponseSchema) {}