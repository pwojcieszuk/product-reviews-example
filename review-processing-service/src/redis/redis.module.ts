import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

@Module({
  providers: [
    RedisService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis(); // TODO: Configure Redis connection, this is default setup
      },
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
