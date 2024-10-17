import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { NotFoundException } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { ReviewService } from 'src/review/review.service';

describe('ProductService', () => {
  let service: ProductService;
  let productRepository: Repository<Product>;
  let redisService: RedisService;
  let reviewService: ReviewService;

  const mockProductRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    preload: jest.fn(),
    delete: jest.fn(),
  };

  const mockRedisService = {
    getProductAverageRating: jest.fn(),
  };

  const mockReviewService = {
    getProductAverageRating: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ReviewService,
          useValue: mockReviewService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepository = module.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
    redisService = module.get<RedisService>(RedisService);
    reviewService = module.get<ReviewService>(ReviewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a new product', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
      };

      const mockProduct = {
        id: 1,
        ...createProductDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      } as Product;

      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto);

      expect(productRepository.create).toHaveBeenCalledWith(createProductDto);
      expect(productRepository.save).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should return an array of products mapped to ProductResponseDto', async () => {
      const mockProducts = [
        {
          id: 1,
          name: 'Product 1',
          description: 'Description 1',
          price: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        {
          id: 2,
          name: 'Product 2',
          description: 'Description 2',
          price: 200,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ] as Product[];

      mockProductRepository.find.mockResolvedValue(mockProducts);

      // Mock Redis to return some average rating for both products
      mockRedisService.getProductAverageRating.mockResolvedValue(4);

      const result = await service.findAll();

      expect(productRepository.find).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: 1,
          name: 'Product 1',
          description: 'Description 1',
          price: 100,
          averageRating: 4, // Make sure Redis returns consistent value
        },
        {
          id: 2,
          name: 'Product 2',
          description: 'Description 2',
          price: 200,
          averageRating: 4, // Make sure Redis returns consistent value
        },
      ]);
    });

    it('should fall back to review service average rating if Redis fails', async () => {
      const mockProducts = [
        {
          id: 1,
          name: 'Product 1',
          description: 'Description 1',
          price: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ] as Product[];

      mockProductRepository.find.mockResolvedValue(mockProducts);
      mockRedisService.getProductAverageRating.mockRejectedValue(
        new Error('Redis Error'),
      );
      mockReviewService.getProductAverageRating.mockResolvedValue(4.5);

      const result = await service.findAll();

      expect(productRepository.find).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: 1,
          name: 'Product 1',
          description: 'Description 1',
          price: 100,
          averageRating: 4.5, // Fallback to Review Service
        },
      ]);
    });
  });

  describe('findOne', () => {
    it('should return a single product mapped to ProductResponseDto', async () => {
      const mockProduct = {
        id: 1,
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      } as Product;

      mockProductRepository.findOne.mockResolvedValue(mockProduct);

      // Mock Redis to return average rating
      mockRedisService.getProductAverageRating.mockResolvedValue(5);

      const result = await service.findOne(1);

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({
        id: 1,
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
        averageRating: 5, // Ensure Redis value matches the mock
      });
    });

    it('should throw NotFoundException if product is not found', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should fall back to review service average rating if Redis fails', async () => {
      const mockProduct = {
        id: 1,
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      } as Product;

      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockRedisService.getProductAverageRating.mockRejectedValue(
        new Error('Redis Error'),
      );
      mockReviewService.getProductAverageRating.mockResolvedValue(4.2);

      const result = await service.findOne(1);

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({
        id: 1,
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
        averageRating: 4.2, // Fallback to Review Service
      });
    });
  });
});
