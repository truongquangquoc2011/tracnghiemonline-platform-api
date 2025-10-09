import { BadRequestException } from '@nestjs/common'
import { FILE_ERRORS } from 'src/shared/constants/file.constant'
import { UserNotFoundException } from 'src/shared/constants/file-error.constant'
import { AuthRepository } from 'src/routes/auth/auth.repo'

/**
 * Kiểm tra user hợp lệ, còn hoạt động
 */
export async function assertOwnerUsable(authRepo: AuthRepository, ownerId: string) {
  const user = await authRepo.findUserIncludeRoleById(ownerId)
  if (!user) throw UserNotFoundException
  await authRepo.validateUserStatus(ownerId)
  return user
}

/**
 * Validate file upload kiểu image
 */
export function assertImageFile(file: Express.Multer.File) {
  if (!file?.mimetype?.startsWith('image/')) {
    throw new BadRequestException(FILE_ERRORS.INVALID_IMAGE_FILE)
  }
}

/**
 * Validate file upload kiểu audio (bao gồm webm)
 */
export function assertAudioFile(file: Express.Multer.File) {
  const isAudio = Boolean(file?.mimetype?.startsWith('audio/'))
  const isWebmAlt = Boolean(file?.mimetype?.startsWith('video/webm'))
  if (!isAudio && !isWebmAlt) {
    throw new BadRequestException(FILE_ERRORS.INVALID_AUDIO_FILE)
  }
}

/**
 * Parse usage từ metaJson
 */
export function parseUsage(metaJson?: string | null): string | undefined {
  if (!metaJson) return
  try {
    const meta = JSON.parse(metaJson)
    return typeof meta?.usage === 'string' ? meta.usage : undefined
  } catch {
    return
  }
}

/**
 * Convert date sang ISO string an toàn
 */
export function toISO(dateLike: Date | string): string {
  if (dateLike instanceof Date) return dateLike.toISOString()
  const d = new Date(dateLike)
  return isNaN(d.getTime()) ? String(dateLike) : d.toISOString()
}
