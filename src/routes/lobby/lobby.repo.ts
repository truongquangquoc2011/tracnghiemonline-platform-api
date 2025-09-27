import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class LobbyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async generateUniquePin(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const pin = Math.floor(100000 + Math.random() * 900000).toString()
      const existed = await this.prisma.lobbySession.findUnique({ where: { pinCode: pin } })
      if (!existed) return pin
    }
    return Math.floor(1000000 + Math.random() * 9000000).toString()
  }

  async createLobby(
    kahootId: string,
    userId: string, // 👈 hostId đổi thành userId
    data: {
      mode: 'classic' | 'team'
      answerOrderRandom: boolean
      questionOrderRandom: boolean
      streaksEnabled: boolean
      nicknameGenerator: boolean
      settingsJson?: string
    },
  ) {
    const pinCode = await this.generateUniquePin()
    return this.prisma.lobbySession.create({
      data: {
        kahoot: { connect: { id: kahootId } },
        host: { connect: { id: userId } },
        pinCode,
        mode: data.mode,
        status: 'waiting',
        answerOrderRandom: data.answerOrderRandom,
        questionOrderRandom: data.questionOrderRandom,
        streaksEnabled: data.streaksEnabled,
        nicknameGenerator: data.nicknameGenerator,
        settingsJson: data.settingsJson,
      },
    })
  }

  findById(sessionId: string) {
    return this.prisma.lobbySession.findUnique({ where: { id: sessionId } })
  }

  findByPin(pinCode: string) {
    return this.prisma.lobbySession.findUnique({ where: { pinCode } })
  }

  async addPlayer(sessionId: string, payload: { nickname: string; userId?: string | null; teamId?: string | null }) {
    const same = await this.prisma.lobbyPlayer.findFirst({
      where: { sessionId, nickname: payload.nickname, leftAt: null },
    })
    if (same) throw new Error('Nickname already taken in this lobby')

    return this.prisma.lobbyPlayer.create({
      data: {
        sessionId,
        teamId: payload.teamId || null,
        userId: payload.userId || null,
        nickname: payload.nickname,
        isKicked: false,
        joinedAt: new Date(),
        streakCurrent: 0,
        streakMax: 0,
      },
    })
  }

  async leavePlayer(sessionId: string, playerId: string) {
    return this.prisma.lobbyPlayer.update({
      where: { id: playerId },
      data: { leftAt: new Date() },
    })
  }

  async kickPlayer(sessionId: string, playerId: string) {
    return this.prisma.lobbyPlayer.update({
      where: { id: playerId },
      data: { isKicked: true, leftAt: new Date() },
    })
  }

  async setStatus(sessionId: string, status: 'waiting' | 'running' | 'ended') {
    const data: any = { status }
    if (status === 'running') data.startedAt = new Date()
    if (status === 'ended') data.endedAt = new Date()
    return this.prisma.lobbySession.update({ where: { id: sessionId }, data })
  }

  getQuestionByIndex(kahootId: string, index: number) {
    return this.prisma.kahootQuestion.findFirst({
      where: { kahootId },
      orderBy: { orderIndex: 'asc' },
      skip: index,
      take: 1,
    })
  }

  getQuestionById(questionId: string) {
    return this.prisma.kahootQuestion.findUnique({ where: { id: questionId } })
  }

  getAnswer(answerId: string) {
    return this.prisma.kahootAnswer.findUnique({ where: { id: answerId } })
  }

  getAnswersForQuestion(questionId: string) {
    return this.prisma.kahootAnswer.findMany({ where: { questionId }, orderBy: { orderIndex: 'asc' } })
  }

  async upsertResponse(data: {
    sessionId: string
    playerId: string
    questionId: string
    answerId: string | null
    isCorrect: boolean
    timeTakenMs: number
    basePoints: number
    speedBonus: number
    pointsAwarded: number
  }) {
    const existed = await this.prisma.lobbyPlayerResponse.findFirst({
      where: { sessionId: data.sessionId, playerId: data.playerId, questionId: data.questionId },
    })
    if (existed) {
      return this.prisma.lobbyPlayerResponse.update({
        where: { id: existed.id },
        data,
      })
    }
    return this.prisma.lobbyPlayerResponse.create({ data })
  }

  async bumpPlayerStats(playerId: string, isCorrect: boolean, points: number) {
    const player = await this.prisma.lobbyPlayer.findUnique({ where: { id: playerId } })
    if (!player) return null
    const newStreak = isCorrect ? player.streakCurrent + 1 : 0
    const newStreakMax = Math.max(player.streakMax || 0, newStreak)
    const newFinal = (player.finalScore || 0) + (points || 0)
    return this.prisma.lobbyPlayer.update({
      where: { id: playerId },
      data: { streakCurrent: newStreak, streakMax: newStreakMax, finalScore: newFinal },
    })
  }

  async getLobbyStateByPin(pinCode: string) {
    const session = await this.findByPin(pinCode)
    if (!session) return null
    const players = await this.prisma.lobbyPlayer.findMany({
      where: { sessionId: session.id, leftAt: null, isKicked: false },
    })
    return { session, players }
  }

  async getLeaderboard(sessionId: string) {
    const players = await this.prisma.lobbyPlayer.findMany({ where: { sessionId } })
    return players
      .map((p) => ({
        playerId: p.id,
        nickname: p.nickname,
        score: p.finalScore || 0,
        streakMax: p.streakMax || 0,
      }))
      .sort((a, b) => b.score - a.score)
  }
}
