// files.dto.ts
import { createZodDto } from 'nestjs-zod';
import {  GetAudioListReqSchema, GetAudioListResSchema, UploadImageReqSchema, UploadImageResSchema, UploadThemeMusicReqSchema, UploadThemeMusicResSchema } from '../file.model';


export class UploadImageReqDTO extends createZodDto(UploadImageReqSchema) {}
export class UploadImageResDTO extends createZodDto(UploadImageResSchema) {}

export class UploadThemeMusicReqDTO extends createZodDto(UploadThemeMusicReqSchema) {}
export class UploadThemeMusicResDTO extends createZodDto(UploadThemeMusicResSchema) {}


export class GetAudioListReqDTO extends createZodDto(GetAudioListReqSchema) {}
export class GetAudioListResDTO extends createZodDto(GetAudioListResSchema) {}