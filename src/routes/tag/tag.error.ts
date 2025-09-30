import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common'

// Tag không tìm thấy
export const TagNotFoundException = new NotFoundException({
  message: 'Error.TagNotFound',
  path: 'tagId',
})

// Tạo hoặc upsert tag thất bại
export const UpsertTagFailedException = new BadRequestException({
  message: 'Error.Tag.UpsertFailed',
  path: 'tag',
})

// Xoá tag thất bại
export const DeleteTagFailedException = new UnprocessableEntityException({
  message: 'Error.Tag.DeleteFailed',
  path: 'tagId',
})

// Liên kết tag bị trùng (kahootId + tagId)
export const TagLinkAlreadyExistsException = new ConflictException({
  message: 'Error.Tag.LinkAlreadyExists',
  path: 'kahootTag',
})

// Không thể thêm tag vào kahoot
export const AddTagToKahootFailedException = new UnprocessableEntityException({
  message: 'Error.Tag.AddFailed',
  path: 'kahootTag',
})

// Xoá tag khỏi kahoot thất bại
export const RemoveTagFromKahootFailedException = new UnprocessableEntityException({
  message: 'Error.Tag.RemoveFailed',
  path: 'kahootTag',
})

// Tag đang được sử dụng (không thể xóa)
export const TagInUseException = (refs: number) =>
  new ConflictException({
    message: `Error.Tag.InUse (${refs} kahoots)`,
    path: 'tagId',
  })
