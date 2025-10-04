import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { isUniqueConstraintPrismaError } from 'src/shared/helper';
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class KahootBankRepository {
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
    SELECT_KAHOOT_FIELDS: {
      id: true,
      title: true,
      visibility: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      coverImage: true,
      theme: true,
      musicTheme: true,
      isTeamModeOk: true,
    },
  }

  /**
   * Lấy danh sách kahoots theo filter, phân trang, sort.
   *
   * @param where - Điều kiện lọc
   * @param page - Trang hiện tại (1-based)
   * @param limit - Số lượng items mỗi trang
   * @param orderBy - Thứ tự sắp xếp
   * @returns Array kahoots
   */
  async listKahoots(where: any, page: number, limit: number, orderBy: any) {
    return this.prismaService.kahoot.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
      select: this.CONFIG.SELECT_KAHOOT_FIELDS,
    })
  }

  /**
   * Đếm số kahoots theo filter.
   *
   * @param where - Điều kiện lọc
   * @returns Tổng số kahoots
   */
  async countKahoots(where: any) {
    return this.prismaService.kahoot.count({ where })
  }

  /**
   * Tìm kahoot theo ID.
   *
   * @param id - Kahoot ID
   * @returns Kahoot nếu tồn tại
   * @throws NotFoundException nếu không tìm thấy
   */
  async findKahootById(id: string) {
    const kahoot = await this.prismaService.kahoot.findUnique({
      where: { id },
      select: this.CONFIG.SELECT_KAHOOT_FIELDS,
    })
    if (!kahoot) {
      throw new NotFoundException('Kahoot không tồn tại')
    }
    return kahoot
  }

  /**
   * Tạo mới kahoot.
   *
   * @param data - Dữ liệu kahoot
   * @returns Kahoot vừa tạo
   */
  async createKahoot(data: Prisma.KahootCreateInput) {
    try {
      return await this.prismaService.kahoot.create({
        data,
        select: this.CONFIG.SELECT_KAHOOT_FIELDS,
      })
    } catch (error) {
      throw new BadRequestException('Tạo kahoot thất bại')
    }
  }

  /**
   * Cập nhật kahoot theo ID.
   *
   * @param id - Kahoot ID
   * @param data - Dữ liệu cập nhật
   * @returns Kahoot sau khi update
   * @throws NotFoundException nếu không tìm thấy kahoot
   */
  async updateKahoot(id: string, data: Prisma.KahootUpdateInput) {
    
    try {
      return await this.prismaService.kahoot.update({
        where: { id },
        data,
        select: this.CONFIG.SELECT_KAHOOT_FIELDS,
      })
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
              throw new BadRequestException('Kahoot not found');
            }
            throw error;
    }
  }

  /**
   * Xoá kahoot theo ID.
   *
   * @param id - Kahoot ID
   * @returns Kahoot vừa xoá
   * @throws NotFoundException nếu không tìm thấy kahoot
   */
  async deleteKahoot(id: string) {
    try {
      return await this.prismaService.kahoot.delete({
        where: { id },
        select: this.CONFIG.SELECT_KAHOOT_FIELDS,
      })
    } catch (error) {
      throw new NotFoundException('Xoá kahoot thất bại hoặc không tồn tại')
    }
  }
}
