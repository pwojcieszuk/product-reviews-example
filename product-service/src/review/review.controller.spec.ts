import { Test, TestingModule } from '@nestjs/testing';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './entities/review.entity';
import { NotFoundException } from '@nestjs/common';

describe('ReviewController', () => {
  let controller: ReviewController;
  let reviewService: ReviewService;

  const mockReviewService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [
        {
          provide: ReviewService,
          useValue: mockReviewService,
        },
      ],
    }).compile();

    controller = module.get<ReviewController>(ReviewController);
    reviewService = module.get<ReviewService>(ReviewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new review successfully', async () => {
      const createReviewDto: CreateReviewDto = {
        firstname: 'John',
        surname: 'Doe',
        reviewText: 'Great product!',
        rating: 5,
        productId: 1,
      };

      const mockReview: Review = {
        id: 1,
        ...createReviewDto,
        product: {
          id: 1,
          name: 'Product 1',
          description: 'Product 1 description',
          reviews: [],
          price: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      } as Review;

      mockReviewService.create.mockResolvedValue(mockReview);

      const result = await controller.create(createReviewDto);

      expect(reviewService.create).toHaveBeenCalledWith(createReviewDto);
      expect(result).toEqual(mockReview);
    });

    it('should throw NotFoundException when the product is not found', async () => {
      const createReviewDto: CreateReviewDto = {
        firstname: 'John',
        surname: 'Doe',
        reviewText: 'Great product!',
        rating: 5,
        productId: 1,
      };

      mockReviewService.create.mockRejectedValue(new NotFoundException());

      await expect(controller.create(createReviewDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a review successfully', async () => {
      const updateReviewDto: UpdateReviewDto = {
        firstname: 'Jane',
        surname: 'Doe',
        reviewText: 'Updated review!',
        rating: 4,
      };

      const mockReview: Review = {
        id: 1,
        ...updateReviewDto,
        product: { id: 1, name: 'Product 1' },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      } as Review;

      mockReviewService.update.mockResolvedValue(mockReview);

      const result = await controller.update(1, updateReviewDto);

      expect(reviewService.update).toHaveBeenCalledWith(1, updateReviewDto);
      expect(result).toEqual(mockReview);
    });

    it('should throw NotFoundException when the review is not found', async () => {
      const updateReviewDto: UpdateReviewDto = {
        firstname: 'Jane',
        surname: 'Doe',
        reviewText: 'Updated review!',
        rating: 4,
      };

      mockReviewService.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update(1, updateReviewDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a review successfully', async () => {
      mockReviewService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(reviewService.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when the review is not found', async () => {
      mockReviewService.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
