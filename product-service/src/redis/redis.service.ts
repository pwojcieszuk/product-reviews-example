import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  async getProductData(productId: number) {
    const data = await this.redisClient.hgetall(`product:${productId}`);
    return {
      averageRating: parseFloat(data.averageRating || '0'),
      reviewCount: parseInt(data.reviewCount || '0', 10),
    };
  }
}
