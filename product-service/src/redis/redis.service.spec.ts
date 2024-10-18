import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import Redis from 'ioredis-mock';

describe('RedisService', () => {
  let service: RedisService;
  let mockRedis: Redis;

  beforeEach(async () => {
    mockRedis = new Redis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    mockRedis.flushall(); // Clear all Redis data between tests
  });

  describe('getProductAverageRating', () => {
    it('should return product data from Redis', async () => {
      const productId = 1;
      await mockRedis.hmset(`product:${productId}`, {
        averageRating: '4.5',
        reviewCount: '10',
      });

      const result = await service.getProductAverageRating(productId);

      expect(result).toEqual({ averageRating: 4.5, reviewCount: 10 });
    });

    it('should return default values if Redis data is missing', async () => {
      const productId = 2;

      const result = await service.getProductAverageRating(productId);

      expect(result).toEqual({ averageRating: 0, reviewCount: 0 });
    });
  });
});
