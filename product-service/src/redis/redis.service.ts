import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  async getProductAverageRating(
    productId: number,
  ): Promise<number | undefined> {
    const data = await this.redisClient.hgetall(`product:${productId}`);
    return data?.averageRating ? parseFloat(data.averageRating) : undefined;
  }
}
