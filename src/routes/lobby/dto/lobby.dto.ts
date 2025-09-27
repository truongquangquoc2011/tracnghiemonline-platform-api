import { createZodDto } from 'nestjs-zod'
import { CreateLobbySchema, JoinLobbySchema, SubmitAnswerSchema } from '../lobby.model'


export class CreateLobbyDTO extends createZodDto(CreateLobbySchema) {}
export class JoinLobbyDTO extends createZodDto(JoinLobbySchema) {}
export class SubmitAnswerDTO extends createZodDto(SubmitAnswerSchema) {}