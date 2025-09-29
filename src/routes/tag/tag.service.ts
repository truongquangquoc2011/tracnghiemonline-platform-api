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

  async listKahootTags(
    userId: string, 
    kahootId: string
  ) {
    try {
    await this.kahootService.getKahootDetail(userId, kahootId);
    const rows = await this.repo.listKahootTags(kahootId);
    return rows.map(r => r.tag);
    } catch (error) {
      throw error
    }
  }

  async addKahootTag(
    userId: string, 
    kahootId: string, 
    body: { tagId?: string; name?: string; kind?: string | null; }
  ) {
    try {
    await this.kahootService.assertKahootOwnerOrAdmin(userId, kahootId);

    let tagId = body.tagId;
    if (!tagId && body.name) {
      const tag = await this.repo.ensureTagByName(body.name, body.kind ?? null);
      tagId = tag.id;
    }
    if (!tagId) throw new Error('tagId or name is required');

    await this.repo.addTagToKahoot(kahootId, userId, tagId);
    return { success: true };
    } catch (error) {
      throw error
    }
  }

    async removeKahootTag(userId: string, kahootId: string, tagId: string) {
      try {
        await this.kahootService.assertKahootOwnerOrAdmin(userId, kahootId);
        await this.repo.removeTagFromKahoot(kahootId, userId, tagId);
        return { success: true };
        } catch (error) {
        throw error
      }
    }
    
    async upsertTags(
      kahootId: string,
      ownerId: string,
      names: string[]) {
      try {
        return await this.repo.upsertTags(ownerId,kahootId, names)
      } catch (error) {
        throw error
      }
    }

    async setKahootTags(
      userId: string,
      kahootId: string,
      tagIds: string[]) {
      try {
        await this.kahootService.assertKahootOwnerOrAdmin(userId, kahootId);
        await this.repo.setKahootTags(kahootId, userId, tagIds);
        return { success: true };
      } catch (error) {
        throw error
      }
    }

  async deleteMasterTag(userId: string, kahootId: string, tagId: string) {
    try {
      const tag = await this.repo.findById(tagId);
      if (!tag) throw TagNotFoundException;

      const refs = await this.repo.countKahootsUsingTag(tagId);
      if (refs > 0) throw TagInUseException(refs);

      await this.repo.deleteTagMaster(kahootId, userId, tagId);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

    async listAllTags(query: any) {
      try {
      const { page, limit, q, kind, onlyUsed } = query;

      const where: any = {};
      if (q) where.name = { contains: q, mode: 'insensitive' };
      if (kind) where.kind = kind;
      if (onlyUsed) where.kahootTags = { some: {} };

      const [items, total] = await Promise.all([
        this.repo.listAll(where, page ?? 1, limit ?? 20),
        this.repo.countAll(where),
      ]);
      return { items, total, page: page ?? 1, limit: limit ?? 20 };
    } catch (error) {
      throw error
    }
  }

  async renameKahootTag(
    actorId: string,
    kahootId: string,
    oldTagId: string,
    newName: string,
    kind: string | null,
    ) {
    try {
      // chỉ owner/admin mới được chỉnh sửa tag
      await this.kahootService.assertKahootOwnerOrAdmin(actorId, kahootId);

      // tạo (hoặc lấy) tag theo tên mới
      const newTag = await this.repo.ensureTagByName(newName, kind);

      // thay liên kết oldTagId -> newTag.id (idempotent)
      await this.repo.swapKahootTag(kahootId, oldTagId, newTag.id);

      return { success: true, tagId: newTag.id };
    } catch (error) {
      throw error;
    }
  }
}
