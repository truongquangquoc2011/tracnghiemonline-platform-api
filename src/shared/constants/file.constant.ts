// src/shared/constants/file.constant.ts
export enum FileStatus {
  UPLOADING = 'UPLOADING',
  READY = 'READY',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

export enum FileUsage {
  GENERIC = 'GENERIC',
  THEME_MUSIC = 'THEME_MUSIC',
}

export const FILE_DEFAULTS = {
  IMAGE_USAGE: FileUsage.GENERIC,
  MUSIC_USAGE: FileUsage.THEME_MUSIC,
  CREATED_AT_FORMAT: 'ISO',
} as const;

export const FILE_MESSAGES = {
  IMAGE_UPLOADED: 'Tải hình ảnh lên thành công.',
  THEME_MUSIC_UPLOADED: 'Tải nhạc chủ đề lên thành công.',
  FILE_NOT_FOUND: 'Không Tìm Thấy'
} as const;

export const FILE_ERRORS = {
  INVALID_IMAGE_FILE: 'Tệp hình ảnh không hợp lệ.',
  INVALID_AUDIO_FILE: 'Tệp âm thanh không hợp lệ.',
  QUERY_FAILED: 'Truy xuất thất bại',
} as const;

export enum AudioUsage {
  THEME_MUSIC = 'THEME_MUSIC',
  SFX = 'SFX',
  VOICE_OVER = 'VOICE_OVER',
  OTHER = 'OTHER',
}