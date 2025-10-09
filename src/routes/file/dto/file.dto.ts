// files.dto.ts
import { createZodDto } from 'nestjs-zod';
import { GetAudioByUsageReqSchema, GetAudioByUsageResSchema, GetLatestAudioByUsageResSchema, UploadImageReqSchema, UploadImageResSchema, UploadThemeMusicReqSchema, UploadThemeMusicResSchema } from '../file.model';


export class UploadImageReqDTO extends createZodDto(UploadImageReqSchema) {}
export class UploadImageResDTO extends createZodDto(UploadImageResSchema) {}

export class UploadThemeMusicReqDTO extends createZodDto(UploadThemeMusicReqSchema) {}
export class UploadThemeMusicResDTO extends createZodDto(UploadThemeMusicResSchema) {}

export class GetAudioByUsageReqDTO extends createZodDto(GetAudioByUsageReqSchema) {}
export class GetAudioByUsageResDTO extends createZodDto(GetAudioByUsageResSchema) {}
export class GetLatestAudioByUsageResDTO extends createZodDto(GetLatestAudioByUsageResSchema) {}