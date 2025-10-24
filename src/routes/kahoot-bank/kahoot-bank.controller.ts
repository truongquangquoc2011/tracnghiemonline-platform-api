import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { KahootBankService } from './kahoot-bank.service';
import { Auth } from 'src/shared/decorator/auth.decorator';
import { AuthTypes, ConditionGuard } from 'src/shared/constants/auth.constant';
import { ActiveUser } from 'src/shared/decorator/active-user.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  ListKahootQueryDTO,
  CreateKahootBodyDTO,
  UpdateKahootBodyDTO,
  KahootParamDTO,
} from './dto/kahoot-bank.dto';
import { ParseObjectIdPipe } from 'src/shared/pipes/parse-objectid.pipe';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerJsonOptions } from 'src/shared/utils/multer.json.util';
@Controller('kahoots')
@ApiTags('Kahoot Bank')
@SkipThrottle({ short: true, long: true })
export class KahootBankController {
  constructor(private readonly service: KahootBankService) {}

  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get(':id/export')
  async exportKahoot(
    @ActiveUser('userId') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.service.exportKahoot(userId, id);
  }

  // Nhận file JSON (khuyến nghị). Nếu muốn mở rộng CSV có thể thêm sau.
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post(':id/import')
  @UseInterceptors(FileInterceptor('file', multerJsonOptions()))
  async importKahoot(
    @ActiveUser('userId') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Mặc định: mode = 'replace' (ghi đè toàn bộ câu hỏi/đáp án + tags)
    return this.service.importKahoot(userId, id, file);
  }
  // Import và TẠO MỚI kahoot từ file JSON
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post('import')
  @UseInterceptors(FileInterceptor('file', multerJsonOptions()))
  async importKahootCreate(
    @ActiveUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // mode = "create" → tạo kahoot mới dựa vào file JSON
    return this.service.importKahootCreate(userId, file);
  }

  // Lấy danh sách kahoots
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get()
  @ApiOperation({
    summary:
      'List kahoots (mine/shared/public based on visibility & permissions)',
  })
  listKahoots(
    @ActiveUser('userId') userId: string,
    @Query() q: ListKahootQueryDTO,
  ) {
    return this.service.listKahoots(userId, q);
  }

  // Lấy danh sách kahoots public/unlisted, không cần auth
  @Get('public')
  @ApiOperation({ summary: 'Explore public/unlisted kahoots' })
  exploreKahoots(@Query() q: ListKahootQueryDTO) {
    // có thể ép visibility = public|unlisted trong service nếu cần
    return this.service.listKahoots('', { ...q, visibility: 'public' });
  }

  // Lấy chi tiết kahoot
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get(':id')
  detail(@ActiveUser('userId') userId: string, @Param('id') id: string) {
    return this.service.getKahootDetail(userId, id);
  }

  // Tạo kahoot mới
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post()
  create(
    @ActiveUser('userId') userId: string,
    @Body() body: CreateKahootBodyDTO,
  ) {
    return this.service.createKahoot(userId, body);
  }

  // Cập nhật kahoot
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Patch(':id')
  update(
    @ActiveUser('userId') userId: string,
    @Param('id') id: string,
    @Body() body: UpdateKahootBodyDTO,
  ) {
    return this.service.updateKahoot(userId, id, body);
  }

  // Xoá kahoot
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Delete(':id')
  remove(@ActiveUser('userId') userId: string, @Param('id') id: string) {
    return this.service.removeKahoot(userId, id);
  }

  // Publish kahoot
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(@ActiveUser('userId') userId: string, @Param('id') id: string) {
    return this.service.publishKahoot(userId, id);
  }

  // Unpublish kahoot
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  unpublish(@ActiveUser('userId') userId: string, @Param('id') id: string) {
    return this.service.unpublishKahoot(userId, id);
  }

  // Duplicate kahoot
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post(':id/duplicate')
  duplicate(@ActiveUser('userId') userId: string, @Param('id') id: string) {
    return this.service.duplicateKahoot(userId, id);
  }

  /** REVIEW KAHOOT – chỉ owner xem được */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get(':id/review')
  @ApiOperation({ summary: 'Xem toàn bộ câu hỏi + đáp án (owner only)' })
  async getKahootReview(
    @ActiveUser('userId') userId: string,
    @Param() param: KahootParamDTO,
  ) {
    return this.service.getKahootReview(param.id, userId);
  }
}
