import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import { Review } from './entities/review.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let reviewRepository: Repository<Review>;

  const mockReviewRepository = {
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: getRepositoryToken(Review),
          useValue: mockReviewRepository,
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    reviewRepository = module.get<Repository<Review>>(
      getRepositoryToken(Review),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductReviewsStats', () => {
    it('should return the correct averageRating and reviewCount', async () => {
      const productId = 1;

      const mockResult = {
        averageRating: '4.5000',
        reviewCount: '10',
      };

      mockReviewRepository
        .createQueryBuilder()
        .getRawOne.mockResolvedValue(mockResult);

      const result = await service.getProductReviewsStats(productId);

      expect(reviewRepository.createQueryBuilder).toHaveBeenCalledWith(
        'review',
      );
      expect(result).toEqual({ averageRating: 4.5, reviewCount: 10 });
    });

    it('should return 0 for averageRating and reviewCount if no reviews exist', async () => {
      const productId = 2;

      const mockResult = {
        averageRating: null,
        reviewCount: '0',
      };

      mockReviewRepository
        .createQueryBuilder()
        .getRawOne.mockResolvedValue(mockResult);

      const result = await service.getProductReviewsStats(productId);

      expect(reviewRepository.createQueryBuilder).toHaveBeenCalledWith(
        'review',
      );
      expect(result).toEqual({ averageRating: 0, reviewCount: 0 });
    });
  });
});
