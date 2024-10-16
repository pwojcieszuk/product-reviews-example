import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Product } from 'src/product/entities/product.entity';
import { NotFoundException } from '@nestjs/common';
import { Producer } from 'kafkajs';
import { ConfigService } from '@nestjs/config';
import { mock } from 'node:test';

const mockReviewRepository = {
  create: jest.fn(),
  save: jest.fn(),
  preload: jest.fn(),
  delete: jest.fn(),
  findOneBy: jest.fn(),
};

const mockProductRepository = {
  findOneBy: jest.fn(),
};

const mockKafkaProducer = {
  send: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => key),
};

describe('ReviewService', () => {
  let service: ReviewService;
  let reviewRepository: Repository<Review>;
  let productRepository: Repository<Product>;
  let kafkaProducer: Producer;
  let configService: ConfigService;

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
        {
          provide: 'KAFKA_PRODUCER',
          useValue: mockKafkaProducer,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
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
    kafkaProducer = module.get<Producer>('KAFKA_PRODUCER');
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a review and emit a Kafka event', async () => {
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

      // Check if Kafka producer is called with correct event
      expect(kafkaProducer.send).toHaveBeenCalledWith({
        topic: 'kafka.topic',
        messages: [
          {
            key: 'kafka.events.reviewAdded',
            value: JSON.stringify({
              productId: createReviewDto.productId,
              reviewId: mockReview.id,
              rating: createReviewDto.rating,
            }),
          },
        ],
      });
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
      expect(kafkaProducer.send).not.toHaveBeenCalled(); // Ensure Kafka event is not emitted
    });
  });

  // Test for update method
  describe('update', () => {
    it('should successfully update a review and emit a Kafka event if rating changed', async () => {
      const updateReviewDto = {
        firstname: 'Jane',
        surname: 'Doe',
        reviewText: 'Updated review!',
        rating: 4, // Changed rating
      };

      const mockExistingReview = {
        id: 1,
        firstname: 'Jane',
        surname: 'Doe',
        reviewText: 'Great product!',
        rating: 5, // Original rating
        product: { id: 1, name: 'Product 1' },
      };

      const mockUpdatedReview = {
        ...mockExistingReview,
        ...updateReviewDto,
      };

      // Mock repository to preload the review and save it
      mockReviewRepository.findOneBy.mockResolvedValue(mockExistingReview);
      mockReviewRepository.preload.mockResolvedValue(mockUpdatedReview);
      mockReviewRepository.save.mockResolvedValue(mockUpdatedReview);

      const result = await service.update(1, updateReviewDto);

      expect(reviewRepository.preload).toHaveBeenCalledWith({
        id: 1,
        ...updateReviewDto,
      });
      expect(reviewRepository.save).toHaveBeenCalledWith(mockUpdatedReview);
      expect(result).toEqual(mockUpdatedReview);

      // Check if Kafka producer is called with correct event (since rating changed)
      expect(kafkaProducer.send).toHaveBeenCalledWith({
        topic: 'kafka.topic',
        messages: [
          {
            key: 'kafka.events.reviewUpdated',
            value: JSON.stringify({
              productId: mockUpdatedReview.product.id,
              reviewId: mockUpdatedReview.id,
              rating: updateReviewDto.rating,
            }),
          },
        ],
      });
    });

    it('should not emit Kafka event if rating did not change', async () => {
      const updateReviewDto = {
        firstname: 'Jane',
        surname: 'Doe',
        reviewText: 'Updated review!',
        rating: 5, // Same rating as existing review
      };

      const mockExistingReview = {
        id: 1,
        firstname: 'Jane',
        surname: 'Doe',
        reviewText: 'Great product!',
        rating: 5,
        product: { id: 1, name: 'Product 1' },
      };

      const mockUpdatedReview = {
        ...mockExistingReview,
        ...updateReviewDto,
      };

      // Mock repository to preload the review and save it
      mockReviewRepository.findOneBy.mockResolvedValue(mockExistingReview);
      mockReviewRepository.preload.mockResolvedValue(mockUpdatedReview);
      mockReviewRepository.save.mockResolvedValue(mockUpdatedReview);

      const result = await service.update(1, updateReviewDto);

      expect(reviewRepository.preload).toHaveBeenCalledWith({
        id: 1,
        ...updateReviewDto,
      });
      expect(reviewRepository.save).toHaveBeenCalledWith(mockUpdatedReview);
      expect(result).toEqual(mockUpdatedReview);

      // Ensure Kafka producer is NOT called (since rating didn't change)
      expect(kafkaProducer.send).not.toHaveBeenCalled();
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
      expect(kafkaProducer.send).not.toHaveBeenCalled(); // Ensure Kafka event is not emitted
    });
  });

  describe('remove', () => {
    it('should successfully delete a review and emit a Kafka event', async () => {
      const mockReview = {
        id: 1,
        product: { id: 1, name: 'Product 1' },
      };

      mockReviewRepository.findOneBy.mockResolvedValue(mockReview); // Review found
      mockReviewRepository.delete.mockResolvedValue({ affected: 1 }); // Review successfully deleted

      await service.remove(1);

      expect(reviewRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(reviewRepository.delete).toHaveBeenCalledWith(1);

      // Check if Kafka producer is called with correct event
      expect(kafkaProducer.send).toHaveBeenCalledWith({
        topic: 'kafka.topic',
        messages: [
          {
            key: 'kafka.events.reviewDeleted',
            value: JSON.stringify({
              productId: mockReview.product.id,
              reviewId: mockReview.id,
            }),
          },
        ],
      });
    });

    it('should throw NotFoundException if review to delete is not found', async () => {
      mockReviewRepository.findOneBy.mockResolvedValue(null); // Review not found

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
      expect(reviewRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(reviewRepository.delete).not.toHaveBeenCalled();
      expect(kafkaProducer.send).not.toHaveBeenCalled(); // Ensure Kafka event is not emitted
    });
  });
});
