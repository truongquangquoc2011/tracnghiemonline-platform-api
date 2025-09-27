import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  TagNotFoundException,
  UpsertTagFailedException,
  DeleteTagFailedException,
  AddTagToKahootFailedException,
  RemoveTagFromKahootFailedException,
} from './tag.error'

@Injectable()
export class TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly CONFIG = {
    SELECT_TAG_FIELDS: {
      id: true,
      name: true,
      kind: true,
    },
  }

  /**
   * Upsert nhiều tags theo mảng names
   */
  async upsertTags(names: string[]) {
    try {
      return await this.prisma.$transaction(
        names.map((name) =>
          this.prisma.tag.upsert({
            where: { name },
            create: { name },
            update: { name },
            select: this.CONFIG.SELECT_TAG_FIELDS,
          }),
        ),
      )
    } catch {
      throw UpsertTagFailedException
    }
  }

  /**
   * Gắn danh sách tags cho 1 kahoot (xoá hết cũ rồi gắn mới).
   */
  async setKahootTags(kahootId: string, tagIds: string[]) {
    try {
      await this.prisma.kahootTag.deleteMany({ where: { kahootId } })
      const uniq = Array.from(new Set(tagIds))
      if (uniq.length === 0) return { count: 0 }
      const data = uniq.map((tagId) => ({ kahootId, tagId }))
      await this.prisma.kahootTag.createMany({ data })
      return { count: uniq.length }
    } catch {
      throw AddTagToKahootFailedException
    }
  }

  /**
   * List tags của 1 kahoot (có include info tag)
   */
  async listKahootTags(kahootId: string) {
    return this.prisma.kahootTag.findMany({
      where: { kahootId },
      include: { tag: true },
    })
  }

  /**
   * Ensure 1 tag tồn tại theo name (tạo mới nếu chưa có).
   */
  async ensureTagByName(name: string, kind?: string | null) {
    try {
      return await this.prisma.tag.upsert({
        where: { name },
        update: { kind: kind ?? undefined },
        create: { name, kind: kind ?? undefined },
        select: this.CONFIG.SELECT_TAG_FIELDS,
      })
    } catch {
      throw UpsertTagFailedException
    }
  }

  /**
   * Liên kết tag với kahoot (idempotent).
   */
  async addTagToKahoot(kahootId: string, tagId: string) {
    try {
      return await this.prisma.kahootTag.upsert({
        where: { kahootId_tagId: { kahootId, tagId } },
        update: {},
        create: { kahootId, tagId },
      })
    } catch {
      throw AddTagToKahootFailedException
    }
  }

  /**
   * Xoá liên kết tag khỏi kahoot.
   */
  async removeTagFromKahoot(kahootId: string, tagId: string) {
    try {
      return await this.prisma.kahootTag.delete({
        where: { kahootId_tagId: { kahootId, tagId } },
      })
    } catch {
      throw RemoveTagFromKahootFailedException
    }
  }

  /**
   * Tìm tag theo ID
   */
  async findById(tagId: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id: tagId },
      select: this.CONFIG.SELECT_TAG_FIELDS,
    })
    if (!tag) throw TagNotFoundException
    return tag
  }

  /**
   * Đếm số kahoot đang dùng 1 tag
   */
  async countKahootsUsingTag(tagId: string) {
    return this.prisma.kahootTag.count({ where: { tagId } })
  }

  /**
   * Xoá tag master (nếu không còn dùng)
   */
  async deleteTag(tagId: string) {
    try {
      return await this.prisma.tag.delete({
        where: { id: tagId },
        select: this.CONFIG.SELECT_TAG_FIELDS,
      })
    } catch {
      throw DeleteTagFailedException
    }
  }

  /**
   * Đếm tổng số tags (với điều kiện where)
   */
  async countAll(where: any) {
    return this.prisma.tag.count({ where })
  }

  /**
   * Lấy tất cả tags (có phân trang + orderBy)
   */
  async listAll(where: any, page = 1, limit = 20, orderBy?: any) {
    return this.prisma.tag.findMany({
      where,
      orderBy: orderBy ?? { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: this.CONFIG.SELECT_TAG_FIELDS,
    })
  }
}
