import { createZodDto } from 'nestjs-zod';
import {
  CreateKahootBodySchema,
  UpdateKahootBodySchema,
  ListKahootQuerySchema,
} from '../kahoot-bank.model';

export class ListKahootQueryDTO extends createZodDto(ListKahootQuerySchema) {}
export class CreateKahootBodyDTO extends createZodDto(CreateKahootBodySchema) {}
export class UpdateKahootBodyDTO extends createZodDto(UpdateKahootBodySchema) {}
