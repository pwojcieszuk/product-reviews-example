import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { RedisService } from '../redis/redis.service';
import { DatabaseService } from '../database/database.service';
import { Job } from 'bullmq';

describe('ReviewService', () => {
  let service: ReviewService;
  let redisService: RedisService;
  let dbService: DatabaseService;

  const mockRedisService = {
    getProductData: jest.fn(),
    updateProductData: jest.fn(),
  };

  const mockDbService = {
    getProductReviews: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: DatabaseService, useValue: mockDbService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    redisService = module.get<RedisService>(RedisService);
    dbService = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processReviewAdded', () => {
    it('should use Redis cache for product data and update cache and database', async () => {
      const job: Partial<Job> = {
        data: { productId: 1, rating: 5 },
      };

      mockRedisService.getProductData.mockResolvedValue({
        averageRating: 4,
        reviewCount: 10,
      });

      await service.processReviewAdded(job as Job);

      expect(redisService.getProductData).toHaveBeenCalledWith(1);
      expect(redisService.updateProductData).toHaveBeenCalledWith(
        1,
        4.090909090909091,
        11,
      );
    });

    it('should fallback to DB if Redis cache is empty and update cache and database', async () => {
      const job: Partial<Job> = {
        data: { productId: 1, rating: 5 },
      };

      mockRedisService.getProductData.mockResolvedValue({
        averageRating: 0,
        reviewCount: 0,
      });
      mockDbService.getProductReviews.mockResolvedValue({
        averageRating: 4,
        reviewCount: 10,
      });

      await service.processReviewAdded(job as Job);

      expect(redisService.getProductData).toHaveBeenCalledWith(1);
      expect(dbService.getProductReviews).toHaveBeenCalledWith(1);
      expect(redisService.updateProductData).toHaveBeenCalledWith(
        1,
        4.090909090909091,
        11,
      );
    });
  });

  describe('processReviewRemoved', () => {
    it('should recalculate average and update when a review is removed', async () => {
      const job: Partial<Job> = {
        data: { productId: 1, rating: 5 },
      };

      mockRedisService.getProductData.mockResolvedValue({
        averageRating: 4,
        reviewCount: 10,
      });

      await service.processReviewRemoved(job as Job);

      expect(redisService.getProductData).toHaveBeenCalledWith(1);
      expect(redisService.updateProductData).toHaveBeenCalledWith(
        1,
        3.888888888888889,
        9,
      );
    });

    it('should reset average rating to 0 if last review is removed', async () => {
      const job: Partial<Job> = {
        data: { productId: 1, rating: 5 },
      };

      mockRedisService.getProductData.mockResolvedValue({
        averageRating: 5,
        reviewCount: 1,
      });

      await service.processReviewRemoved(job as Job);

      expect(redisService.getProductData).toHaveBeenCalledWith(1);
      expect(redisService.updateProductData).toHaveBeenCalledWith(1, 0, 0);
    });
  });

  describe('processReviewUpdated', () => {
    it('should recalculate average based on updated review', async () => {
      const job: Partial<Job> = {
        data: { productId: 1, oldRating: 4, rating: 5 },
      };

      mockRedisService.getProductData.mockResolvedValue({
        averageRating: 4,
        reviewCount: 10,
      });

      await service.processReviewUpdated(job as Job);

      expect(redisService.getProductData).toHaveBeenCalledWith(1);
      expect(redisService.updateProductData).toHaveBeenCalledWith(1, 4.1, 10);
    });

    it('should handle a situation where Redis cache is empty and fallback to DB', async () => {
      const job: Partial<Job> = {
        data: { productId: 1, oldRating: 4, rating: 5 },
      };

      mockRedisService.getProductData.mockResolvedValue({
        averageRating: 0,
        reviewCount: 0,
      });
      mockDbService.getProductReviews.mockResolvedValue({
        averageRating: 4,
        reviewCount: 10,
      });

      await service.processReviewUpdated(job as Job);

      expect(redisService.getProductData).toHaveBeenCalledWith(1);
      expect(dbService.getProductReviews).toHaveBeenCalledWith(1);
      expect(redisService.updateProductData).toHaveBeenCalledWith(1, 4.1, 10);
    });
  });
});
