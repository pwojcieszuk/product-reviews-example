import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { BullmqService } from '../bullmq/bullmq.service';
import { RedisService } from '../redis/redis.service';
import { DatabaseService } from '../database/database.service';

describe('ReviewService', () => {
  let service: ReviewService;
  let bullmqService: BullmqService;
  let redisService: RedisService;
  let dbService: DatabaseService;

  const mockBullmqService = {
    addReviewJob: jest.fn(),
  };

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
        { provide: BullmqService, useValue: mockBullmqService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: DatabaseService, useValue: mockDbService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    bullmqService = module.get<BullmqService>(BullmqService);
    redisService = module.get<RedisService>(RedisService);
    dbService = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleReviewAdded', () => {
    it('should add review job to BullMQ', async () => {
      const review = { productId: 1, rating: 5 };

      await service.handleReviewAdded(review);

      expect(bullmqService.addReviewJob).toHaveBeenCalledWith(
        'review-added',
        review,
      );
      expect(bullmqService.addReviewJob).toHaveBeenCalledTimes(1);
    });
  });

  describe('processReviewAdded', () => {
    it('should use Redis cache for product data and update cache and database', async () => {
      const job = { data: { productId: 1, rating: 5 } };

      mockRedisService.getProductData.mockResolvedValue({
        averageRating: 4,
        reviewCount: 10,
      });

      await service.processReviewAdded(job);

      expect(redisService.getProductData).toHaveBeenCalledWith(1);
      expect(redisService.updateProductData).toHaveBeenCalledWith(
        1,
        4.090909090909091,
        11,
      );
    });

    it('should fallback to DB if Redis cache is empty and update cache and database', async () => {
      const job = { data: { productId: 1, rating: 5 } };

      mockRedisService.getProductData.mockResolvedValue({
        averageRating: 0,
        reviewCount: 0,
      });
      mockDbService.getProductReviews.mockResolvedValue({
        averageRating: 4,
        reviewCount: 10,
      });

      await service.processReviewAdded(job);

      expect(redisService.getProductData).toHaveBeenCalledWith(1);
      expect(dbService.getProductReviews).toHaveBeenCalledWith(1);
      expect(redisService.updateProductData).toHaveBeenCalledWith(
        1,
        4.090909090909091,
        11,
      );
    });
  });
});
