import {
  Body,
  Controller,
  Post,
  Patch,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LobbyService } from './lobby.service';
import { CreateLobbyDTO, JoinLobbyDTO, SubmitAnswerDTO } from './dto/lobby.dto';
import { ActiveUser } from 'src/shared/decorator/active-user.decorator';
import { Auth } from 'src/shared/decorator/auth.decorator';
import { AuthTypes, ConditionGuard } from 'src/shared/constants/auth.constant';
import {
  badRequestResponse,
  internalServerErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from 'src/shared/swagger/swagger.util';
import { MESSAGES } from 'src/shared/constants/message.constant';

@ApiTags('Lobby')
@Controller('lobbies')
export class LobbyController {
  constructor(private readonly service: LobbyService) {}

  /**
   * Host creates a new lobby from a kahoot.
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post('kahoots/:kahootId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a lobby from a kahoot' })
  @ApiResponse({ status: 201, description: 'Lobby created successfully' })
  @ApiResponse(unauthorizedResponse())
  @ApiResponse(badRequestResponse())
  @ApiResponse(internalServerErrorResponse())
  async createLobby(
    @Param('kahootId') kahootId: string,
    @ActiveUser('userId') userId: string,
    @Body() dto: CreateLobbyDTO,
  ) {
    const lobby = await this.service.createLobby(kahootId, userId, dto);
    return {
      sessionId: lobby.id,
      pinCode: lobby.pinCode,
      status: lobby.status,
    };
  }

  /**
   * Player joins a lobby via PIN.
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post(':pinCode/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a lobby via PIN code' })
  @ApiResponse({ status: 200, description: 'Joined lobby successfully' })
  @ApiResponse(notFoundResponse(MESSAGES.VALIDATION_MESSAGES.LOBBY.NOT_FOUND))
  @ApiResponse(unauthorizedResponse())
  async joinByPin(
    @Param('pinCode') pinCode: string,
    @Body() dto: JoinLobbyDTO,
    @ActiveUser('userId') userId?: string,
  ) {
    return this.service.joinLobbyByPin(pinCode, {
      nickname: dto.nickname,
      userId: userId || null,
      teamId: dto.teamId || null,
    });
  }

  /**
   * Host starts the lobby game.
   */
  @Auth([AuthTypes.BEARER])
  @Patch(':sessionId/start')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Start a lobby game' })
  @ApiResponse({ status: 204, description: 'Game started successfully' })
  async start(
    @Param('sessionId') sessionId: string,
    @ActiveUser('userId') userId: string,
  ) {
    await this.service.startGame(sessionId, userId);
  }

  /**
   * Host ends the lobby game.
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Patch(':sessionId/end')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End a lobby game' })
  @ApiResponse({ status: 204, description: 'Game ended successfully' })
  async end(
    @Param('sessionId') sessionId: string,
    @ActiveUser('userId') userId: string,
  ) {
    // Khi guard không gắn được user, trả 401
    if (!userId) {
      throw new UnauthorizedException('Chưa đăng nhập');
    }
    await this.service.endGame(sessionId, userId);
  }

  /**
   * Player submits an answer (REST fallback, prefer WebSocket).
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post(':pinCode/submit')
  @HttpCode(HttpStatus.BAD_REQUEST)
  @ApiOperation({ summary: 'Submit an answer (REST fallback)' })
  async submitByRest(
    @Param('pinCode') pinCode: string,
    @Body() dto: SubmitAnswerDTO,
    @ActiveUser('userId') userId?: string,
  ) {
    throw new Error(
      'Use WebSocket SUBMIT_ANSWER in production. This REST endpoint is only a placeholder.',
    );
  }

  /**
   * Get the leaderboard for a lobby.
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get(':pinCode/leaderboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the lobby leaderboard' })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully',
  })
  @ApiResponse(notFoundResponse(MESSAGES.VALIDATION_MESSAGES.LOBBY.NOT_FOUND))
  async leaderboard(@Param('pinCode') pinCode: string) {
    return this.service.getLeaderboardByPin(pinCode);
  }
}
