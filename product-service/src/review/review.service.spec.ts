import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Product } from 'src/product/entities/product.entity';
import { NotFoundException } from '@nestjs/common';

const mockReviewRepository = {
  create: jest.fn(),
  save: jest.fn(),
  preload: jest.fn(),
  delete: jest.fn(),
};

const mockProductRepository = {
  findOneBy: jest.fn(),
};

describe('ReviewService', () => {
  let service: ReviewService;
  let reviewRepository: Repository<Review>;
  let productRepository: Repository<Product>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        {
          provide: getRepositoryToken(Review),
          useValue: mockReviewRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    reviewRepository = module.get<Repository<Review>>(
      getRepositoryToken(Review),
    );
    productRepository = module.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test for create method
  describe('create', () => {
    it('should successfully create a review', async () => {
      const createReviewDto = {
        firstname: 'John',
        surname: 'Doe',
        reviewText: 'Great product!',
        rating: 5,
        productId: 1,
      };

      const mockProduct = { id: 1, name: 'Product 1' };
      const { productId, ...reviewData } = createReviewDto;
      const mockReview = { id: 1, ...reviewData, product: mockProduct };

      // Mock product repository to return a valid product
      mockProductRepository.findOneBy.mockResolvedValue(mockProduct);
      mockReviewRepository.create.mockReturnValue(mockReview);
      mockReviewRepository.save.mockResolvedValue(mockReview);

      const result = await service.create(createReviewDto);

      expect(productRepository.findOneBy).toHaveBeenCalledWith({
        id: createReviewDto.productId,
      });
      expect(reviewRepository.create).toHaveBeenCalledWith({
        firstname: 'John',
        surname: 'Doe',
        reviewText: 'Great product!',
        rating: 5,
        product: mockProduct,
      });
      expect(reviewRepository.save).toHaveBeenCalledWith(mockReview);
      expect(result).toEqual(mockReview);
    });

    it('should throw NotFoundException if product not found', async () => {
      const createReviewDto = {
        firstname: 'John',
        surname: 'Doe',
        reviewText: 'Great product!',
        rating: 5,
        productId: 1,
      };

      mockProductRepository.findOneBy.mockResolvedValue(null); // Product not found

      await expect(service.create(createReviewDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(productRepository.findOneBy).toHaveBeenCalledWith({
        id: createReviewDto.productId,
      });
      expect(reviewRepository.create).not.toHaveBeenCalled();
      expect(reviewRepository.save).not.toHaveBeenCalled();
    });
  });

  // Test for update method
  describe('update', () => {
    it('should successfully update a review', async () => {
      const updateReviewDto = {
        firstname: 'Jane',
        surname: 'Doe',
        reviewText: 'Updated review!',
        rating: 4,
      };

      const mockReview = { id: 1, ...updateReviewDto };

      // Mock repository to preload the review and save it
      mockReviewRepository.preload.mockResolvedValue(mockReview);
      mockReviewRepository.save.mockResolvedValue(mockReview);

      const result = await service.update(1, updateReviewDto);

      expect(reviewRepository.preload).toHaveBeenCalledWith({
        id: 1,
        ...updateReviewDto,
      });
      expect(reviewRepository.save).toHaveBeenCalledWith(mockReview);
      expect(result).toEqual(mockReview);
    });

    it('should throw NotFoundException if review to update is not found', async () => {
      const updateReviewDto = {
        firstname: 'Jane',
        surname: 'Doe',
        reviewText: 'Updated review!',
        rating: 4,
      };

      mockReviewRepository.preload.mockResolvedValue(null); // Review not found

      await expect(service.update(1, updateReviewDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(reviewRepository.preload).toHaveBeenCalledWith({
        id: 1,
        ...updateReviewDto,
      });
      expect(reviewRepository.save).not.toHaveBeenCalled();
    });
  });

  // Test for remove method
  describe('remove', () => {
    it('should successfully delete a review', async () => {
      mockReviewRepository.delete.mockResolvedValue({ affected: 1 }); // Review successfully deleted

      await service.remove(1);

      expect(reviewRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if review to delete is not found', async () => {
      mockReviewRepository.delete.mockResolvedValue({ affected: 0 }); // Review not found

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
      expect(reviewRepository.delete).toHaveBeenCalledWith(1);
    });
  });
});
