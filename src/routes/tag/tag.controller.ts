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
  @Get('tags/all')
  async listAll(@Query() query: ListTagsQueryDTO) {
    return this.service.listAllTags(query);
  }

  // Lấy tags của kahoot
  @Get(':kahootId/tags')
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  listKahootTags(
    @ActiveUser('userId') actorId: string,
    @Param('kahootId') kahootId: string,
  ) {
    return this.service.listKahootTags(actorId, kahootId);
  }

  // Thêm tag cho kahoot
  @Post(':kahootId/tags')
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  addKahootTag(
    @ActiveUser('userId') actorId: string,
    @Param('kahootId') kahootId: string,
    @Body() body: AddKahootTagBodyDTO,
  ) {
    return this.service.addKahootTag(actorId, kahootId, body as any);
  }

  // Xoá tag khỏi kahoot
  @Delete(':kahootId/tags/:tagId')
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  removeKahootTag(
    @ActiveUser('userId') actorId: string,
    @Param('kahootId') kahootId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.service.removeKahootTag(actorId, kahootId, tagId);
  }

  // Upsert tag mới
  @Post('upsert/tags')
  async upsert(@Body() body: UpsertTagsBodyDTO /* & UpsertTagsBody */) {
    const tags = await this.service.upsertTags(body.names);
    return { count: tags.length, items: tags };
  }

  // Gắn tags cho 1 kahoot
  @Put(':kahootId/tags/:tagId')
  async upsertAndSet(@Param('kahootId') kahootId: string, @Body() body: UpsertTagsBodyDTO) {
    const tags = await this.service.upsertTags(body.names);
    return this.service.setKahootTags(kahootId, tags.map(t => t.id));
  }

  // Xoá tag master (nếu không còn kahoot nào dùng)
  @Delete('delete/:tagId/tags')
  async deleteMasterTag(
    @ActiveUser('userId') userId: string, 
    @Param('tagId', ParseObjectIdPipe) id: string,
  ) {
    return this.service.deleteMasterTag(userId, id);
  }
}
