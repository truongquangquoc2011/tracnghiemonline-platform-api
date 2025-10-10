import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChallengeService } from './challenge.service';
import {
  CreateChallengeBodyDTO,
  UpdateChallengeBodyDTO,
  StartAttemptBodyDTO,
  StartAttemptParamDTO,
  SubmitAnswerBodyDTO,
  SubmitAnswerParamDTO,
  SubmitAttemptParamDTO,
  ChallengeParamDTO,
  ListChallengesQueryDTO,
} from './dto/challenge.dto';
import { Auth } from 'src/shared/decorator/auth.decorator';
import { AuthTypes, ConditionGuard } from 'src/shared/constants/auth.constant';
import { ActiveUser } from 'src/shared/decorator/active-user.decorator';
import { UseGuards, /* ... */ } from '@nestjs/common';
import { OptionalAccessTokenGuard } from 'src/shared/guards/optional-access-token.guard';
@ApiTags('Challenges')
@Controller('challenges')
export class ChallengeController {
  constructor(private readonly service: ChallengeService) {}

// 1) LIST challenges (public/unlisted hoặc của user)
@UseGuards(OptionalAccessTokenGuard)
@Get()
@ApiOperation({ summary: 'Lấy danh sách Challenges (public hoặc thuộc user)' })
@ApiResponse({ status: 200 })
@HttpCode(HttpStatus.OK)
async listChallenges(
  @Query() query: ListChallengesQueryDTO,
  @ActiveUser('userId') userId: string | null,
) {
  return await this.service.listChallenges(query, userId ?? null);
}

// 2) LIST attempts của 1 challenge (owner mới xem)
@Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
@Get(':id/attempts')
@ApiOperation({ summary: 'Danh sách attempts của challenge (owner)' })
@ApiResponse({ status: 200 })
async listAttempts(
  @Param() param: ChallengeParamDTO,
  @Query() query: ListChallengesQueryDTO, // tái dùng page/limit/sort
  @ActiveUser('userId') userId: string,
) {
  return await this.service.listAttempts(param.id, query, userId);
}

// 3) GET attempt detail (owner hoặc chính người làm attempt)
@UseGuards(OptionalAccessTokenGuard)
@Get('challenge-attempts/:attempt_id')
@ApiOperation({ summary: 'Chi tiết 1 attempt' })
@ApiResponse({ status: 200 })
async getAttemptDetail(
  @Param() param: SubmitAttemptParamDTO,
  @ActiveUser('userId') userId: string | null,
) {
  return await this.service.getAttemptDetail(param.attempt_id, userId ?? null);
}

// 4) LIST responses của 1 attempt (owner hoặc chính người làm)
@UseGuards(OptionalAccessTokenGuard)
@Get('challenge-attempts/:attempt_id/responses')
@ApiOperation({ summary: 'Danh sách câu trả lời của attempt' })
@ApiResponse({ status: 200 })
async listAttemptResponses(
  @Param() param: SubmitAttemptParamDTO,
  @Query() query: ListChallengesQueryDTO, // page/limit/sort
  @ActiveUser('userId') userId: string | null,
) {
  return await this.service.listAttemptResponses(param.attempt_id, query, userId ?? null);
}

  /** DETAIL (public/unlisted xem được; private chỉ owner) */
  // thêm auth optional để guard decode Bearer nếu có, còn không có vẫn cho qua
  @UseGuards(OptionalAccessTokenGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết Challenge' })
  @ApiResponse({ status: 200, description: 'Chi tiết Challenge hợp lệ' })
  @HttpCode(HttpStatus.OK)
  async getChallengeDetail(
    @Param() param: ChallengeParamDTO,
    @ActiveUser('userId') userId: string | null,
  ) {
    return await this.service.getChallengeDetail(param.id, userId ?? null);
  }

    /** OPEN (chỉ owner) */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post(':id/open')
  @ApiOperation({ summary: 'Open challenge (chỉ owner kahoot)' })
  @ApiResponse({ status: 200, description: 'Mở challenge thành công' })
  @HttpCode(HttpStatus.OK)
  async openChallenge(
    @Param() param: ChallengeParamDTO,
    @ActiveUser('userId') userId: string,
  ) {
    return await this.service.openChallenge(param.id, userId);
  }

  /** CLOSE (chỉ owner) */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post(':id/closed')
  @ApiOperation({ summary: 'Close challenge (chỉ owner kahoot)' })
  @ApiResponse({ status: 200, description: 'Đóng challenge thành công' })
  @HttpCode(HttpStatus.OK)
  async closeChallenge(
    @Param() param: ChallengeParamDTO,
    @ActiveUser('userId') userId: string,
  ) {
    return await this.service.closeChallenge(param.id, userId);
  }

  /** CREATE (chỉ owner kahoot) */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post()
  @ApiOperation({ summary: 'Tạo Challenge mới' })
  @ApiResponse({ status: 201, description: 'Tạo Challenge thành công' })
  async createChallenge(
    @Body() body: CreateChallengeBodyDTO,
    @ActiveUser('userId') userId: string,
  ) {
    return await this.service.createChallenge(body, userId);
  }

  /** UPDATE (chỉ owner) */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật Challenge' })
  @ApiResponse({ status: 200, description: 'Cập nhật Challenge thành công' })
  @HttpCode(HttpStatus.OK)
  async updateChallenge(
    @Param() param: ChallengeParamDTO,
    @Body() body: UpdateChallengeBodyDTO,
    @ActiveUser('userId') userId: string,
  ) {
    return await this.service.updateChallenge(param.id, body, userId);
  }

  /** DELETE (chỉ owner) */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Delete(':id')
  @ApiOperation({ summary: 'Xoá Challenge (chỉ owner)' })
  @ApiResponse({ status: 200, description: 'Xoá thành công' })
  @HttpCode(HttpStatus.OK)
  async deleteChallenge(
    @Param() param: ChallengeParamDTO,
    @ActiveUser('userId') userId: string,
  ) {
    await this.service.deleteChallenge(param.id, userId);
    return { message: 'Challenge đã được xoá' };
  }

  /** START ATTEMPT (guest allowed) */
  // cũng nên optional để nếu có token thì lưu được userId vào attempt
  @UseGuards(OptionalAccessTokenGuard)
  @Post(':id/start')
  @ApiOperation({ summary: 'Bắt đầu làm Challenge' })
  @ApiResponse({ status: 201, description: 'Bắt đầu Challenge thành công' })
  async startAttempt(
    @Param() param: StartAttemptParamDTO,
    @Body() body: StartAttemptBodyDTO,
    @ActiveUser('userId') userId: string | null,
  ) {
    return await this.service.startAttempt(param.id, body, userId ?? null);
  }


  /** SUBMIT ANSWER (guest allowed) */
  @Post(':attempt_id/answer')
  @ApiOperation({ summary: 'Gửi câu trả lời trong Challenge Attempt' })
  @ApiResponse({ status: 201, description: 'Gửi câu trả lời thành công' })
  async submitAnswer(
    @Param() param: SubmitAnswerParamDTO,
    @Body() body: SubmitAnswerBodyDTO,
  ) {
    return await this.service.submitAnswer(param.attempt_id, body);
  }

  /** SUBMIT ATTEMPT (guest allowed) */
  @Post(':attempt_id/submit')
  @ApiOperation({ summary: 'Nộp bài Challenge Attempt' })
  @ApiResponse({ status: 201, description: 'Nộp bài thành công' })
  async submitAttempt(@Param() param: SubmitAttemptParamDTO) {
    return await this.service.submitAttempt(param.attempt_id);
  }
}
