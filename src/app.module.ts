import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './routes/auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerBehindProxyGuard } from './shared/guards/throttler-behind-proxy.guard';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { LobbyModule } from './routes/lobby/lobby.module';
import { KahootBankModule } from './routes/kahoot-bank/kahoot-bank.module';
import CustomZodValidationPipe from './shared/pipes/custom-zod-validation.pipe';
import { QuestionModule } from './routes/question/question.module';
import { AnswerModule } from './routes/answer/answer.module';
import { TagModule } from './routes/tag/tag.module';
import { FavoritesModule } from './routes/favorites/favorites.module';
import { CommentsModule } from './routes/comments/comments.module';

@Module({
  imports: [
    SharedModule,
    AuthModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: 60000,
          limit: 5,
        },
        {
          name: 'long',
          ttl: 120000,
          limit: 7,
        },
      ],
    }),
    LobbyModule,
    KahootBankModule,
    QuestionModule,
    AnswerModule,
    TagModule,
    FavoritesModule,
    CommentsModule, 
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: CustomZodValidationPipe,
    },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
