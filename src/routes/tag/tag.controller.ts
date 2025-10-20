// src/routes/tag/tag.controller.ts
import { Controller, Get, Post, Delete, Put, Param, Body, Query } from '@nestjs/common';
import { TagService } from './tag.service';
import { UpsertTagsBodyDTO, AddKahootTagBodyDTO, ListTagsQueryDTO } from './dto/tag.dto';
import { Auth } from 'src/shared/decorator/auth.decorator';
import { AuthTypes, ConditionGuard } from 'src/shared/constants/auth.constant';
import { ActiveUser } from 'src/shared/decorator/active-user.decorator';
import { ParseObjectIdPipe } from 'src/shared/pipes/parse-objectid.pipe';

@Controller()
export class TagController {
  constructor(private readonly service: TagService) {}

  // Lấy toàn bộ tags (ai cũng xem được sau khi auth)
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get('tags/all')
  async listAll(@Query() query: ListTagsQueryDTO) {
    return this.service.listAllTags(query);
  }

  // Lấy tags của một kahoot (admin/owner)
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get('kahoots/:kahootId/tags')
  listKahootTags(
    @ActiveUser('userId') userId: string,
    @Param('kahootId', ParseObjectIdPipe) kahootId: string,
  ) {
    return this.service.listKahootTags(userId, kahootId);
  }

  // Tạo tags (admin-only)
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post('tags')
  async createTags(
    @ActiveUser('userId') userId: string,
    @Body() body: UpsertTagsBodyDTO,
  ) {
    const tags = await this.service.createTagsAdmin(userId, body.names);
    return { items: tags };
  }

  // Gắn 1 tag vào kahoot (admin/owner)
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Put('kahoots/:kahootId/tags/:tagId')
  attachTagToKahoot(
    @ActiveUser('userId') userId: string,
    @Param('kahootId', ParseObjectIdPipe) kahootId: string,
    @Param('tagId', ParseObjectIdPipe) tagId: string,
  ) {
    return this.service.attachTagById(userId, kahootId, tagId);
  }

  // Gỡ tag khỏi kahoot (admin/owner)
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Delete('kahoots/:kahootId/tags/:tagId')
  removeKahootTag(
    @ActiveUser('userId') userId: string,
    @Param('kahootId', ParseObjectIdPipe) kahootId: string,
    @Param('tagId', ParseObjectIdPipe) tagId: string,
  ) {
    return this.service.removeKahootTag(userId, kahootId, tagId);
  }

  // Xoá vĩnh viễn tag (admin-only)
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Delete('tags/:tagId/admin')
  async deleteMasterTagAdmin(
    @ActiveUser('userId') userId: string,
    @Param('tagId', ParseObjectIdPipe) tagId: string,
  ) {
    return this.service.deleteMasterTag(userId, tagId);
  }
}
