import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common'

// Tag không tìm thấy
export const TagNotFoundException = new NotFoundException({
  message: 'Thông báo lỗi! Tag không tồn tại',
  path: 'tagId',
})

// Tạo hoặc upsert tag thất bại
export const UpsertTagFailedException = new BadRequestException({
  message: 'Thông báo lỗi! Tạo hoặc cập nhật tag thất bại',
  path: 'tag',
})

// Xoá tag thất bại
export const DeleteTagFailedException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Xoá tag thất bại',
  path: 'tagId',
})

// Liên kết tag bị trùng (kahootId + tagId)
export const TagLinkAlreadyExistsException = new ConflictException({
  message: 'Thông báo lỗi! Tag đã được thêm vào Kahoot',
  path: 'kahootTag',
})

// Không thể thêm tag vào kahoot
export const AddTagToKahootFailedException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Thêm tag vào Kahoot thất bại',
  path: 'kahootTag',
})

// Xoá tag khỏi kahoot thất bại
export const RemoveTagFromKahootFailedException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Xoá tag khỏi Kahoot thất bại',
  path: 'kahootTag',
})

// Tag đang được sử dụng (không thể xóa)
export const TagInUseException = (refs: number) =>
  new ConflictException({
    message: `Thông báo lỗi! Tag này đang được sử dụng trong (${refs} kahoots)`,
    path: 'tagId',
  })
