import { Injectable } from '@nestjs/common'
import { Prisma, File } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'

export type CreateFileInput = {
  ownerId: string
  url: string
  mime: string
  size: number
  metaJson?: string | null
}

export type FileListItem = Pick<File, 'id' | 'url' | 'mime' | 'size' | 'createdAt' | 'metaJson'>

export type PagedFileResult = {
  items: FileListItem[]
  total: number
}

type Tx = Prisma.TransactionClient

@Injectable()
export class FilesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /** Helper chọn client: nếu có truyền transaction thì dùng, ko thì dùng prismaService mặc định */
  private getClient(tx?: Tx) {
    return tx ?? this.prismaService
  }

  /** Tạo file record (cho upload) */
  async createFile(data: CreateFileInput, tx?: Tx): Promise<File> {
    const client = this.getClient(tx)
    return client.file.create({ data })
  }

  /**
   * Lấy danh sách audio GLOBAL (không theo owner)
   * - Chỉ lấy file có mime bắt đầu bằng 'audio/'
   * - Có thể lọc theo usage (nếu truyền)
   * - Có thể lọc theo status READY (mặc định true)
   * - Có phân trang
   */
  async findAllAudioGlobal(
    params: {
      usage?: string
      page: number
      limit: number
      onlyReady?: boolean
    },
    tx?: Tx,
  ): Promise<PagedFileResult> {
    const client = this.getClient(tx)
    const { usage, page, limit, onlyReady = true } = params

    // --- Xây where ---
    const where: Prisma.FileWhereInput = {
      mime: { startsWith: 'audio/' },
    }

    const metaConditions: Prisma.FileWhereInput[] = []

    if (usage) {
      metaConditions.push({
        metaJson: { contains: `"usage":"${usage}"` },
      })
    }

    if (onlyReady) {
      metaConditions.push({
        metaJson: { contains: `"status":"READY"` },
      })
    }

    if (metaConditions.length > 0) {
      where.AND = metaConditions
    }

    // --- Query ---
    const [items, total] = await Promise.all([
      client.file.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          url: true,
          mime: true,
          size: true,
          createdAt: true,
          metaJson: true,
        },
      }),
      client.file.count({ where }),
    ])

    return { items, total }
  }
}
