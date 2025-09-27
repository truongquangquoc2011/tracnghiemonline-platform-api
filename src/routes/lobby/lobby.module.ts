import { Module } from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { LobbyController } from './lobby.controller';
import { LobbyGateway } from './lobby.gateway';
import { LobbyRepository } from './lobby.repo';

@Module({
  controllers: [LobbyController],
  providers: [LobbyService, LobbyRepository, LobbyGateway],
  exports: [LobbyService],
})
export class LobbyModule {}
