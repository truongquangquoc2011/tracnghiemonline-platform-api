import { NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';


export const ChallengeNotFoundException = new NotFoundException({
  message: 'Challenge không tồn tại hoặc đã bị xoá',
  path: 'challenge',
});

export const ChallengeForbiddenException = new ForbiddenException({
  message: 'Bạn không có quyền truy cập hoặc chỉnh sửa Challenge này',
  path: 'challenge',
});

export const ChallengeAlreadyClosedException = new ConflictException({
  message: 'Challenge đã bị đóng, không thể bắt đầu hoặc nộp bài',
  path: 'challenge',
});

export const ChallengeNotStartedException = new BadRequestException({
  message: 'Challenge chưa bắt đầu, không thể tham gia',
  path: 'challenge',
});

export const ChallengeTimeWindowException = new BadRequestException({
  message: 'Challenge này chỉ được làm trong khoảng thời gian hợp lệ',
  path: 'challenge',
});

export const CreateChallengeFailedException = new ConflictException({
  message: 'Tạo Challenge thất bại (trùng hoặc dữ liệu không hợp lệ)',
  path: 'challenge',
});

export const UpdateChallengeFailedException = new ConflictException({
  message: 'Cập nhật Challenge thất bại (dữ liệu không hợp lệ hoặc trùng)',
  path: 'challenge',
});

export const DeleteChallengeFailedException = new ConflictException({
  message: 'Xoá Challenge thất bại',
  path: 'challenge',
});

/** ====== Attempt-level errors ====== */
export const AttemptNotFoundException = new NotFoundException({
  message: 'Attempt không tồn tại hoặc không thuộc Challenge này',
  path: 'attempt',
});

export const AttemptForbiddenException = new ForbiddenException({
  message: 'Bạn không có quyền xem Attempt này',
  path: 'attempt',
});

export const StartAttemptFailedException = new ConflictException({
  message: 'Bắt đầu Attempt thất bại (trùng hoặc Challenge đã đóng)',
  path: 'attempt',
});

export const SubmitAttemptFailedException = new ConflictException({
  message: 'Nộp bài thất bại (bài đã nộp hoặc Challenge đã hết hạn)',
  path: 'attempt',
});

/** ====== Response-level errors ====== */
export const SubmitAnswerFailedException = new ConflictException({
  message: 'Gửi câu trả lời thất bại (trùng hoặc dữ liệu không hợp lệ)',
  path: 'response',
});

export const DuplicateAnswerException = new ConflictException({
  message: 'Bạn đã trả lời câu hỏi này trong Attempt này rồi',
  path: 'response',
});

/** ====== Validation / Relationship errors ====== */
export const KahootNotFoundOrPrivateException = new NotFoundException({
  message: 'Kahoot không tồn tại hoặc là riêng tư',
  path: 'kahoot',
});

export const ChallengeKahootMismatchException = new BadRequestException({
  message: 'Challenge không thuộc về Kahoot này',
  path: 'kahoot',
});

export const OpenChallengeFailedException = new ConflictException({
  message: 'Không thể MỞ challenge (đã có challenge đang mở cho kahoot này)',
  path: 'challenge',
});

export const CloseChallengeFailedException = new ConflictException({
  message: 'Không thể ĐÓNG challenge',
  path: 'challenge',
});
