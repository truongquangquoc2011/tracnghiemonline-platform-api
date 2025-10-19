import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service';
import { KahootBankRepository } from './kahoot-bank.repo'
import { QuestionRepository } from '../question/question.repo'
import { AnswerRepository } from '../answer/answer.repo'
import {
  InvalidImportFileException,
  KahootNotFoundException,
} from './kahoot-bank.error'  
import { isUniqueConstraintPrismaError } from 'src/shared/helper';

@Injectable()
export class KahootBankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: KahootBankRepository,
    private readonly questionRepo: QuestionRepository,
    private readonly answerRepo: AnswerRepository,
  ) {}

  // Danh sách kahoot với phân trang, lọc, tìm kiếm
  async listKahoots(userId: string, query: any) {
    try {
    const { page, limit, sort, ownerId, visibility, tagId, q } = query
    const where: any = {}

    if (ownerId) where.ownerId = ownerId
    if (visibility) where.visibility = visibility
    if (tagId) where.kahootTags = { some: { tagId } }
    if (q) where.title = { contains: q, mode: 'insensitive' }

    const orderBy = sort
      ? { [sort.split(':')[0]]: (sort.split(':')[1] ?? 'desc') }
      : { createdAt: 'desc' }

    const [items, total] = await Promise.all([
      this.repo.listKahoots(where, page ?? 1, limit ?? 20, orderBy),
      this.repo.countKahoots(where),
    ])
    return { items, total, page: page ?? 1, limit: limit ?? 20 }
    } catch (error) {
      throw new BadRequestException(error.message)
    }
  }

  // Chi tiết kahoot, kiểm tra quyền xem
  async getKahootDetail(userId: string, id: string) {
    try {
    const item = await this.repo.findKahootById(id)
    if (!item) throw new BadRequestException('Kahoot not found')
    // Quyền xem: nếu private thì chỉ owner xem được (tạm thời)
    if (item.visibility === 'private' && item.ownerId !== userId) {
      throw new ForbiddenException('Unauthorized to view this kahoot')
    }
    return item
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
              throw new BadRequestException('Kahoot not found');
            }
      throw error
    }
  }

  // Tạo kahoot mới
  async createKahoot(ownerId: string, data: any) {
    try {
      return await this.repo.createKahoot({ ownerId, ...data })
    } catch (error) {
      throw new BadRequestException(error.message)
    }
  }

  // Cập nhật kahoot
  async updateKahoot(userId: string, id: string, data: any) {
    try {
    const item = await this.getKahootDetail(userId, id)

    if (item.ownerId !== userId) {
      throw new ForbiddenException('Forbidden');
  }
    const isPublished = !!item.publishedAt
    if (isPublished) {
      const allowed = (({ title, description, coverImage }) => ({ title, description, coverImage }))(data)
      return this.repo.updateKahoot(id, allowed)
    }
    return this.repo.updateKahoot(id, data)
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
              throw new BadRequestException('Kahoot not found');
            }
      throw error
    }
  }

  // Xoá kahoot
  async removeKahoot(userId: string, id: string) {
    try {
    const item = await this.getKahootDetail(userId, id)
    if (item.ownerId !== userId) throw new ForbiddenException('Forbidden')
    return this.repo.deleteKahoot(id)
   } catch (error) {
    if (isUniqueConstraintPrismaError(error)) {
              throw new BadRequestException('Kahoot not found');
            }
      throw error
    }
  }

  async publishKahoot(userId: string, id: string) {
    try {
      const item = await this.getKahootDetail(userId, id)
      if (item.ownerId !== userId) throw new ForbiddenException('Forbidden')

      // Dùng questionRepo / answerRepo sau khi tách
      const questions = await this.questionRepo.listQuestions(id)
      if (questions.length === 0) {
        throw new BadRequestException('Kahoot must have at least 1 question before publish')
      }
      for (const q of questions) {
        const answers = await this.answerRepo.listAnswers(q.id)
        if (answers.length < 2) {
          throw new BadRequestException(`Question "${q.text ?? q.id}" must have at least 2 answers`)
        }
        if (!answers.some(a => a.isCorrect)) {
          throw new BadRequestException(`Question "${q.text ?? q.id}" must have at least 1 correct answer`)
        }
      }
      return this.repo.updateKahoot(id, { publishedAt: new Date() })
      } catch (error) {
        if (isUniqueConstraintPrismaError(error)) {
                throw new BadRequestException('Kahoot not found');
              }
        throw error
      }
    }

  async unpublishKahoot(userId: string, id: string) {
    try {
    const item = await this.getKahootDetail(userId, id)
    if (item.ownerId !== userId) throw new ForbiddenException('Forbidden')
    return this.repo.updateKahoot(id, { publishedAt: null })
  } catch (error) {
    if (isUniqueConstraintPrismaError(error)) {
              throw new BadRequestException('Kahoot not found');
            }
      throw error
    }
  }

  async duplicateKahoot(userId: string, id: string) {
    try {
    // Kiểm tra quyền xem / quyền duplicate bằng logic hiện có
    const srcMeta = await this.getKahootDetail(userId, id);

    // Transaction để đảm bảo tính toàn vẹn
    const result = await this.prisma.$transaction(async (tx) => {
      // 1) Lấy đầy đủ kahoot nguồn (tags, questions, answers)
      const src = await tx.kahoot.findUnique({
        where: { id },
        include: {
          kahootTags: true, // [{ id, kahootId, tagId }]
          questions: {
            include: { answers: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!src) throw new NotFoundException('Kahoot not found');

      // 2) Tạo kahoot mới (metadata)
      const dst = await tx.kahoot.create({
        data: {
          ownerId: userId,
          title: src.title + ' (copy)',
          description: src.description,
          visibility: 'private',
          coverImage: src.coverImage,
          theme: src.theme,
          musicTheme: src.musicTheme,
          isTeamModeOk: src.isTeamModeOk,
          publishedAt: null,
        },
      });

        // 3  Copy tags bằng upsert
      if (src.kahootTags?.length) {
        await Promise.all(
          src.kahootTags.map((t) =>
            tx.kahootTag.upsert({
              where: { kahootId_tagId: { kahootId: dst.id, tagId: t.tagId } },
              update: {},
              create: { kahootId: dst.id, tagId: t.tagId },
            }),
          ),
        );
      }

      // 4) Copy questions + answers
      for (const q of src.questions ?? []) {
        const newQ = await tx.kahootQuestion.create({
          data: {
            kahootId: dst.id,
            text: q.text,
            imageUrl: q.imageUrl,
            videoUrl: q.videoUrl,
            orderIndex: q.orderIndex,
            timeLimit: q.timeLimit,
            pointsMultiplier: q.pointsMultiplier,
            isMultipleSelect: q.isMultipleSelect,
          },
        });

        if (q.answers?.length) {
          await tx.kahootAnswer.createMany({
            data: q.answers.map((a) => ({
              questionId: newQ.id,
              text: a.text,
              isCorrect: a.isCorrect,
              shape: a.shape,
              colorHex: a.colorHex,
              orderIndex: a.orderIndex,
            })),
          });
        }
      }
      // 5) Trả về kahoot mới (metadata). Nếu muốn trả kèm questions/tags thì include thêm.
      return dst;
    });
    return result;
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
              throw new BadRequestException('Kahoot not found');
            }
      throw error
    }
  }
  /**
   * Chỉ owner (hoặc admin – nếu bạn có check role) mới được sửa kahoot.
   * Trả về bản ghi kahoot nếu hợp lệ.
   */
  async assertKahootOwnerOrAdmin(userId: string, kahootId: string) {
    try {
    const kahoot = await this.repo.findKahootById(kahootId);
    if (!kahoot) throw new NotFoundException('Kahoot not found');

    // TODO: nếu có RolesGuard / quyền admin thì check thêm tại đây
    const isOwner = kahoot.ownerId === userId;
    if (!isOwner) throw new ForbiddenException('Forbidden');
    return kahoot;
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
              throw new BadRequestException('Kahoot not found');
            }
      throw error
    } 
  }

  /**
   * Đảm bảo question thuộc đúng kahoot đang thao tác.
   * Trả về bản ghi question nếu hợp lệ.
   */
  async assertQuestionBelongsToKahoot(kahootId: string, questionId: string) {
    try {
    // nếu QuestionRepository chưa có findById, dùng prisma trực tiếp:
    const q = await this.prisma.kahootQuestion.findUnique({
      where: { id: questionId },
      select: { id: true, kahootId: true },
    });
    if (!q) throw new NotFoundException('Question not found');
    if (q.kahootId !== kahootId) {
      throw new ForbiddenException('Question does not belong to this kahoot');
    }
    return q;
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
              throw new BadRequestException('Kahoot not found');
            }
      throw error
    }
  }

  /** EXPORT: Trả JSON đầy đủ kahoot + tags + questions + answers */
  async exportKahoot(userId: string, id: string) {
    try {
    await this.getKahootDetail(userId, id);

    const data = await this.prisma.kahoot.findUnique({
      where: { id },
      include: {
        kahootTags: { include: { tag: true } },
        questions: {
          include: { answers: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!data) throw KahootNotFoundException;

    // Chuẩn hoá JSON xuất ra (clean fields)
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      visibility: data.visibility,
      coverImage: data.coverImage,
      theme: data.theme,
      musicTheme: data.musicTheme,
      isTeamModeOk: data.isTeamModeOk,
      tags: (data.kahootTags ?? []).map(t => t.tag?.name).filter(Boolean),
      questions: (data.questions ?? []).map(q => ({
        text: q.text,
        imageUrl: q.imageUrl ?? null,
        videoUrl: q.videoUrl ?? null,
        timeLimit: q.timeLimit,
        pointsMultiplier: q.pointsMultiplier,
        isMultipleSelect: q.isMultipleSelect,
        orderIndex: q.orderIndex,
        answers: (q.answers ?? []).map(a => ({
          text: a.text,
          isCorrect: a.isCorrect,
          shape: a.shape ?? null,
          colorHex: a.colorHex ?? null,
          orderIndex: a.orderIndex,
        })),
      })),
      exportedAt: new Date().toISOString(),
    };
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
              throw new BadRequestException('Kahoot not found');
            }
      throw error
    }
  }

  // IMPORT: Chỉ owner mới được import vào kahoot của họ
  async importKahoot(userId: string, id: string, file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw InvalidImportFileException;

    // Kiểm tra quyền (private → chỉ owner). Hàm này đã check public/unlisted view
    const kahoot = await this.getKahootDetail(userId, id);
    if (kahoot.ownerId !== userId) {
      throw new ForbiddenException('Forbidden');
    }

    // Parse JSON
    let payload: any;
    try {
      payload = JSON.parse(file.buffer.toString('utf8'));
    } catch {
      throw new BadRequestException('Import file must be valid JSON');
    }

    // Validate sơ bộ
    if (!Array.isArray(payload?.questions) || payload.questions.length === 0) {
      throw new BadRequestException('Import JSON must contain "questions" (non-empty array)');
    }
    try {
    // Transaction đảm bảo tính toàn vẹn
    const result = await this.prisma.$transaction(async (tx) => {
      // 1) Cập nhật metadata kahoot nếu có
      const toUpdate: any = {};
      for (const k of ['title','description','visibility','coverImage','theme','musicTheme','isTeamModeOk']) {
        if (payload[k] !== undefined) toUpdate[k] = payload[k];
      }
      if (Object.keys(toUpdate).length) {
        await tx.kahoot.update({ where: { id }, data: toUpdate });
      }

      // 2) Ghi đè TAGS nếu có mảng tags (theo tên)
      if (Array.isArray(payload.tags)) {
        // upsert các tag theo name
        const uniqueNames = [...new Set(payload.tags.map((s: string) => String(s).trim()).filter(Boolean))];
        const tags = await Promise.all(
          uniqueNames.map(async (name: string) => {
            return tx.tag.upsert({
              where: { name },
              update: {},
              create: { name },
            });
          }),
        );

        // clear links cũ & gắn mới
        await tx.kahootTag.deleteMany({ where: { kahootId: id } });
        if (tags.length) {
          await tx.kahootTag.createMany({
            data: tags.map(t => ({ kahootId: id, tagId: t.id })),
            // bỏ skipDuplicates vì Mongo không hỗ trợ ở model này
          });
        }
      }

      // 3) Xoá toàn bộ questions/answers cũ của kahoot
      const oldQs = await tx.kahootQuestion.findMany({ where: { kahootId: id }, select: { id: true } });
      const oldQIds = oldQs.map(q => q.id);
      if (oldQIds.length) {
        await tx.kahootAnswer.deleteMany({ where: { questionId: { in: oldQIds } } });
        await tx.kahootQuestion.deleteMany({ where: { kahootId: id } });
      }

      // 4) Tạo mới questions + answers
      for (const [idx, q] of payload.questions.entries()) {
        if (!q?.text) throw new BadRequestException(`Question[${idx}] is missing "text"`);

        const newQ = await tx.kahootQuestion.create({
          data: {
            kahootId: id,
            text: q.text,
            imageUrl: q.imageUrl ?? null,
            videoUrl: q.videoUrl ?? null,
            orderIndex: Number.isInteger(q.orderIndex) ? q.orderIndex : idx,
            timeLimit: q.timeLimit ?? 30,
            pointsMultiplier: q.pointsMultiplier ?? 1,
            isMultipleSelect: !!q.isMultipleSelect,
          },
        });

        const answers = Array.isArray(q.answers) ? q.answers : [];
        if (answers.length < 2) throw new BadRequestException(`Question[${idx}] must have at least 2 answers`);
        if (!answers.some((a: any) => !!a?.isCorrect)) {
          throw new BadRequestException(`Question[${idx}] must have at least 1 correct answer`);
        }

        await tx.kahootAnswer.createMany({
          data: answers.map((a: any, aIdx: number) => ({
            questionId: newQ.id,
            text: String(a.text ?? ''),
            isCorrect: !!a.isCorrect,
            shape: a.shape ?? null,
            colorHex: a.colorHex ?? null,
            orderIndex: Number.isInteger(a.orderIndex) ? a.orderIndex : aIdx,
          })),
        });
      }

      // 5) Trả về metadata sau import
      return tx.kahoot.findUnique({ where: { id } });
    });
    return result;
    } catch (error) {
      
      throw error
    }
  }

  /**
   * Chỉ cho phép ADMIN.
   * Tuỳ schema của bạn, mình kiểm tra "mạnh tay" để đỡ lệ thuộc tên field:
   */
  async assertAdmin(userId: string) {
    // 1) Lấy user (role là ID tham chiếu)
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!u) throw new ForbiddenException('Forbidden');
    const roleId = String(u.role ?? '').trim();
    if (!roleId) throw new ForbiddenException('Forbidden');

    // 2) Tải role theo ID
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, slug: true, isActive: true },
    });

    // 3) Kiểm tra quyền admin theo slug/name
    if (!role || role.isActive === false) {
      throw new ForbiddenException('Forbidden');
    }
    const okNames = new Set(['ADMIN', 'PRO']);
    const okSlugs = new Set(['admin', 'proadmin']);

    const nameOk = okNames.has(String(role.name ?? '').toUpperCase());
    const slugOk = okSlugs.has(String(role.slug ?? '').toLowerCase());

    if (!(nameOk || slugOk)) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
