import { Injectable, NotFoundException } from '@nestjs/common';
import { TagRepository } from './tag.repo';
import { KahootBankService } from '../kahoot-bank/kahoot-bank.service';
import { TagInUseException, TagNotFoundException } from './tag.error';

@Injectable()
export class TagService {
  constructor(
    private readonly repo: TagRepository,
    private readonly kahootService: KahootBankService,
  ) {}

  async listAllTags(query: any) {
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
  }

  async listKahootTags(userId: string, kahootId: string) {
    await this.kahootService.getKahootDetail(userId, kahootId);
    const rows = await this.repo.listKahootTags(kahootId);
    return rows.map(r => r.tag).filter(Boolean);
  }

  async createTagsAdmin(actorId: string, names: string[]) {
    await this.kahootService.assertAdmin(actorId);
    return this.repo.upsertTagsGlobal(names);
  }

  async attachTagById(userId: string, kahootId: string, tagId: string) {
    await this.kahootService.assertKahootOwnerOrAdmin(userId, kahootId);
    const tag = await this.repo.findById(tagId);
    if (!tag) throw TagNotFoundException;
    await this.repo.addTagToKahoot(kahootId, userId, tagId);
    return { success: true };
  }

  async removeKahootTag(userId: string, kahootId: string, tagId: string) {
    await this.kahootService.assertKahootOwnerOrAdmin(userId, kahootId);
    await this.repo.removeTagFromKahoot(kahootId, userId, tagId);
    return { success: true };
  }

  async deleteMasterTag(userId: string, tagId: string) {
    await this.kahootService.assertAdmin(userId);

    const tag = await this.repo.findById(tagId);
    if (!tag) throw TagNotFoundException;

    const refs = await this.repo.countKahootsUsingTag(tagId);
    if (refs > 0) throw TagInUseException(refs);

    await this.repo.deleteTagById(tagId);
    return { success: true };
  }
}
