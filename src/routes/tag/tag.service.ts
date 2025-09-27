import { Injectable } from '@nestjs/common';
import { TagRepository } from './tag.repo';
import { KahootBankService } from '../kahoot-bank/kahoot-bank.service';
import { TagInUseException, TagNotFoundException } from './tag.error';

@Injectable()
export class TagService {
    constructor(
        private readonly repo: TagRepository,
        private readonly kahootService: KahootBankService
    ) {}

  async listKahootTags(actorId: string, kahootId: string) {
    try {
    // bảo đảm actor có quyền xem kahoot (dùng getKahootDetail đã check private/owner)
    await this.kahootService.getKahootDetail(actorId, kahootId);
    const rows = await this.repo.listKahootTags(kahootId);
    // trả mảng Tag "sạch"
    return rows.map(r => r.tag);
    } catch (error) {
      throw error
    }
  }

  async addKahootTag(actorId: string, kahootId: string, body: { tagId?: string; name?: string; kind?: string | null; }) {
    try {
    // chỉ owner/admin mới được chỉnh sửa tag
    await this.kahootService.assertKahootOwnerOrAdmin(actorId, kahootId);

    let tagId = body.tagId;
    if (!tagId && body.name) {
      const tag = await this.repo.ensureTagByName(body.name, body.kind ?? null);
      tagId = tag.id;
    }
    if (!tagId) throw new Error('tagId or name is required');

    await this.repo.addTagToKahoot(kahootId, tagId);
    return { success: true };
    } catch (error) {
      throw error
    }
  }

    async removeKahootTag(actorId: string, kahootId: string, tagId: string) {
      try {
        await this.kahootService.assertKahootOwnerOrAdmin(actorId, kahootId);
        await this.repo.removeTagFromKahoot(kahootId, tagId);
        return { success: true };
        } catch (error) {
        throw error
      }
    }
    
    async upsertTags(names: string[]) {
      try {
        return await this.repo.upsertTags(names)
      } catch (error) {
        throw error
      }
    }

    async setKahootTags(kahootId: string, tagIds: string[]) {
      try {
        return await this.repo.setKahootTags(kahootId, tagIds)
      } catch (error) {
        throw error
      }
    }

    async deleteMasterTag(actorId: string, tagId: string) {
      try {
      // (tùy bạn) Có thể yêu cầu quyền admin: await this.kahootService.assertAdmin(actorId);

      const tag = await this.repo.findById(tagId);
      if (!tag) throw TagNotFoundException;

      const refs = await this.repo.countKahootsUsingTag(tagId);
      if (refs > 0) throw TagInUseException(refs);

      await this.repo.deleteTag(tagId);
      return { success: true };
      } catch (error) {
      throw error
    }
    }

    async listAllTags(query: any) {
      try {
      const { page, limit, q, kind, onlyUsed } = query;

      const where: any = {};
      if (q) where.name = { contains: q, mode: 'insensitive' };
      if (kind) where.kind = kind;
      if (onlyUsed) where.kahootTags = { some: {} }; // chỉ tag đang được gán ở ít nhất 1 kahoot

      const [items, total] = await Promise.all([
        this.repo.listAll(where, page ?? 1, limit ?? 20),
        this.repo.countAll(where),
      ]);
      return { items, total, page: page ?? 1, limit: limit ?? 20 };
    } catch (error) {
      throw error
    }
  }
}
