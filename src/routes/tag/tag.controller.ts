import { Controller, Get, Post, Delete, Put, Param, Body, Query } from '@nestjs/common';
import { TagService } from './tag.service';
import { UpsertTagsBodyDTO, AddKahootTagBodyDTO, ListTagsQueryDTO } from './dto/tag.dto';
import { Auth } from 'src/shared/decorator/auth.decorator';
import { AuthTypes, ConditionGuard } from 'src/shared/constants/auth.constant';
import { ActiveUser } from 'src/shared/decorator/active-user.decorator';
import { ParseObjectIdPipe } from 'src/shared/pipes/parse-objectid.pipe';

@Controller('kahoots')
export class TagController {
  constructor(
    private readonly service: TagService,
  ) {}

  // Lấy danh sách tags (có phân trang, lọc, tìm kiếm)
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get('tags/all')
  async listAll(
    @Query() query: ListTagsQueryDTO
  ) {
    return this.service.listAllTags(query);
  }

  // Lấy tags của kahoot
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get(':kahootId/tags')
  listKahootTags(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
  ) {
    return this.service.listKahootTags(userId, kahootId);
  }

  // Thêm tag cho kahoot
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post(':kahootId/tags')
  addKahootTag(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
    @Body() body: AddKahootTagBodyDTO,
  ) {
    return this.service.addKahootTag(userId, kahootId, body as any);
  }

    // Upsert tag mới
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post(':kahootId/tags/upsert')
  async upsertForKahoot(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
    @Body() body: UpsertTagsBodyDTO
  ) {
    const tags = await this.service.upsertTags(userId, kahootId, body.names);
    return this.service.setKahootTags(userId, kahootId, (tags ?? []).map(t => t.id));
  }

    // Gắn tags cho 1 kahoot
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Put(':kahootId/tags/:tagId')
  async upsertAndSet(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
    @Param('tagId') tagId: string,
    @Body() body: { name: string; kind?: string | null },
  ) {
    return this.service.renameKahootTag(userId, kahootId, tagId, body.name, body.kind ?? null);
  }

  // Xoá tag khỏi kahoot
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Delete(':kahootId/tags/:tagId')
  removeKahootTag(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.service.removeKahootTag(userId, kahootId, tagId);
  }
  // Xoá tag master (nếu không còn kahoot nào dùng)
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Delete(':kahootId/tags/:tagId/master')
  async deleteMasterTag(
    @ActiveUser('userId') userId: string,
    @Param('kahootId') kahootId: string,
    @Param('tagId', ParseObjectIdPipe) tagId: string,
  ) {
    return this.service.deleteMasterTag(userId, kahootId, tagId);
  }
}
