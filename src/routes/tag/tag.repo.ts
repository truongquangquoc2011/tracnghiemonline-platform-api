import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  TagNotFoundException,
  UpsertTagFailedException,
  DeleteTagFailedException,
  AddTagToKahootFailedException,
  RemoveTagFromKahootFailedException,
} from './tag.error'
import { isUniqueConstraintPrismaError } from 'src/shared/helper';
import { Prisma } from '@prisma/client';

@Injectable()
export class TagRepository {
  constructor(private readonly prismaService: PrismaService) {}

  // Kiểm tra quyền sở hữu kahoot
    private async checkOwnershipOrThrow(kahootId: string, ownerId: string) {
      const kahoot = await this.prismaService.kahoot.findUnique({
        where: { id: kahootId },
        select: { id: true, ownerId: true },
      });
  
      if (!kahoot) {
        throw new NotFoundException({
          message: 'Error.KahootNotFound',
          path: 'kahoot',
        });
      }
  
      if (kahoot.ownerId !== ownerId) {
        throw new ForbiddenException({
          message: 'Error.Forbidden',
          path: 'ownerId',
        });
      }
  
      return kahoot;
    }

    // ================== CONFIG ==================
  private readonly CONFIG = {
    SELECT_TAG_FIELDS: {
      id: true,
      name: true,
      kind: true,
    },
  }


  /**
   * Gắn danh sách tags cho 1 kahoot (xoá hết cũ rồi gắn mới).
   */
  async setKahootTags(kahootId: string, ownerId: string, tagIds: string[]) {
    try {
      await this.checkOwnershipOrThrow(kahootId, ownerId);
      await this.prismaService.kahootTag.deleteMany({ where: { kahootId } })
      const uniq = Array.from(new Set(tagIds))
      if (uniq.length === 0) return { count: 0 }
      const data = uniq.map((tagId) => ({ kahootId, tagId }))
      await this.prismaService.kahootTag.createMany({ data })
      return { count: uniq.length }
    } catch (error)  {
      if (isUniqueConstraintPrismaError(error)) {
        throw AddTagToKahootFailedException;
    }
      throw error
    }
  }

  /**
   * List tags của 1 kahoot (có include info tag)
   */
  async listKahootTags(kahootId: string) {
  try {
    const rows = await this.prismaService.kahootTag.findMany({
      where: { kahootId },
      include: { tag: true },
    });
    // lọc mồ côi (nếu có tag=null)
    return rows.filter(r => r.tag != null);
  } catch (error) {
    // nếu vẫn lỗi, dọn orphan tối thiểu:
    const links = await this.prismaService.kahootTag.findMany({
      where: { kahootId },
      select: { id: true, tagId: true },
    });
    const tagIds = [...new Set(links.map(l => l.tagId))];
    const tags = await this.prismaService.tag.findMany({
      where: { id: { in: tagIds } },
      select: this.CONFIG.SELECT_TAG_FIELDS,
    });
    const ok = new Map(tags.map(t => [t.id, t]));
    return links
      .filter(l => ok.has(l.tagId))
      .map(l => ({ kahootId, tagId: l.tagId, tag: ok.get(l.tagId)! }));
  }
}
  /**
   * Ensure 1 tag tồn tại theo name (tạo mới nếu chưa có).
   */
  async ensureTagByName(name: string, kind?: string | null) {
    try {
      return await this.prismaService.tag.upsert({
        where: { name },
        update: { kind: kind ?? undefined },
        create: { name, kind: kind ?? undefined },
        select: this.CONFIG.SELECT_TAG_FIELDS,
      });
      }catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw UpsertTagFailedException;
      }
      throw UpsertTagFailedException;
    }
  }

  /**
   * Liên kết tag với kahoot (idempotent).
   */
  async addTagToKahoot(kahootId: string,ownerId: string, tagId: string) {
    try {
      await this.checkOwnershipOrThrow(kahootId, ownerId);
      return await this.prismaService.kahootTag.upsert({
        where: { kahootId_tagId: { kahootId, tagId } },
        update: {},
        create: { kahootId, tagId },
      })
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
      throw AddTagToKahootFailedException
    }
      throw error
    }
  }

  /**
   * Upsert với cách viết chuẩn nhất 
   */
  async upsertTags(
    kahootId: string,
    ownerId: string,
    names: string[]
  ) {
    try {
      await this.checkOwnershipOrThrow(kahootId, ownerId);
      return await this.prismaService.$transaction(
        names.map((name) =>
          this.prismaService.tag.upsert({
            where: { name },
            create: { name },
            update: { name },
            select: this.CONFIG.SELECT_TAG_FIELDS,
          }),
        ),
      )
    } catch (error) {
          if (isUniqueConstraintPrismaError(error)) {
      throw UpsertTagFailedException
    }
  }
}

  /**
   * Xoá liên kết tag khỏi kahoot.
   */
  async removeTagFromKahoot(kahootId: string,ownerId: string, tagId: string) {
    try {
      await this.checkOwnershipOrThrow(kahootId, ownerId);
      return await this.prismaService.kahootTag.delete({
        where: { kahootId_tagId: { kahootId, tagId } },
      })
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
      throw RemoveTagFromKahootFailedException
    }
      throw error
    }
  }

  /**
   * Tìm tag theo ID
   */
  async findById(tagId: string) {
    try {
      const tag = await this.prismaService.tag.findUnique({
        where: { id: tagId },
        select: this.CONFIG.SELECT_TAG_FIELDS,
      });
      if (!tag) throw TagNotFoundException;
      return tag;
    } catch (error) {
      // nếu error là TagNotFoundException thì giữ nguyên
      throw error;
    }
  }

  /**
   * Đếm số kahoot đang dùng 1 tag
   */
  async countKahootsUsingTag(tagId: string) {
    try {
      return await this.prismaService.kahootTag.count({ where: { tagId } });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Xoá tag master (nếu không còn dùng)
   */
  async deleteTagMaster(kahootId: string, ownerId: string, tagId: string) {
    try {
      await this.checkOwnershipOrThrow(kahootId, ownerId);

      const refs = await this.prismaService.kahootTag.count({ where: { tagId } });
      if (refs > 0) {
        throw DeleteTagFailedException;
      }

      return await this.prismaService.tag.delete({
        where: { id: tagId },
        select: this.CONFIG.SELECT_TAG_FIELDS,
      });
    } catch (error) {
      throw DeleteTagFailedException;
    }
  }

  /**
   * Đếm tổng số tags (với điều kiện where)
   */
  async countAll(where: any) {
    try {
      return await this.prismaService.tag.count({ where });
    } catch (error) {
      throw error;
    }
  }
  /**
   * Lấy tất cả tags (có phân trang + orderBy)
   */ 
  async listAll(where: any, page = 1, limit = 20, orderBy?: any) {
    try {
      return await this.prismaService.tag.findMany({
        where,
        orderBy: orderBy ?? { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: this.CONFIG.SELECT_TAG_FIELDS,
      });
    } catch (error) {
      throw error;
    }
  }

  async swapKahootTag(kahootId: string, oldTagId: string, newTagId: string) {
    try {
      await this.prismaService.$transaction(async (tx) => {
        // Xoá liên kết cũ nếu có (idempotent)
        try {
          await tx.kahootTag.delete({
            where: { kahootId_tagId: { kahootId, tagId: oldTagId } },
          });
        } catch (err) {
          // Bỏ qua nếu không tồn tại (P2025); các lỗi khác ném tiếp
          if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2025') {
            throw err;
          }
        }

        // Upsert liên kết mới (idempotent)
        await tx.kahootTag.upsert({
          where: { kahootId_tagId: { kahootId, tagId: newTagId } },
          update: {},
          create: { kahootId, tagId: newTagId },
        });
      });

      return { success: true };
    } catch (error) {
      throw AddTagToKahootFailedException;
    }
  }
  // tag.repo.ts
async upsertTagsGlobal(names: string[]) {
  try {
    return await this.prismaService.$transaction(
      names.map((name) =>
        this.prismaService.tag.upsert({
          where: { name },
          create: { name },
          update: { name },
          select: this.CONFIG.SELECT_TAG_FIELDS,
        }),
      ),
    );
  } catch (error) {
    if (isUniqueConstraintPrismaError(error)) {
      throw UpsertTagFailedException;
    }
    throw UpsertTagFailedException;
  }
}

// tag.repo.ts
async deleteTagById(tagId: string) {
  try {
    return await this.prismaService.tag.delete({
      where: { id: tagId },
      select: this.CONFIG.SELECT_TAG_FIELDS,
    });
  } catch (error) {
    throw DeleteTagFailedException;
  }
}

}