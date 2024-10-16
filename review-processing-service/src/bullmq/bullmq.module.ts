import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ReviewService } from 'src/review/review.service';
import { RedisService } from 'src/redis/redis.service';
import { BullModule } from '@nestjs/bullmq';
import { BullmqService } from './bullmq.service';
import { ReviewProcessor } from './review.processor';
import { DatabaseService } from 'src/database/database.service';
import Redis from 'ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from 'src/database/entities/review.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([Review]),
    BullModule.registerQueueAsync({
      name: 'review-processing',
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    BullmqService,
    ReviewProcessor,
    ReviewService,
    RedisService,
    DatabaseService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [BullmqService],
})
export class BullmqModule {}
