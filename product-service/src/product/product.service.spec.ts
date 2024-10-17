import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { NotFoundException } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

describe('ProductService', () => {
  let service: ProductService;
  let productRepository: Repository<Product>;
  let redisService: RedisService;

  const mockProductRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    preload: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockRedisService = {
    getProductData: jest.fn(),
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
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepository = module.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
    redisService = module.get<RedisService>(RedisService);
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
      mockRedisService.getProductData.mockResolvedValue({ averageRating: 4 });

      const result = await service.findAll();

      expect(productRepository.find).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: 1,
          name: 'Product 1',
          description: 'Description 1',
          price: 100,
          averageRating: 4,
        },
        {
          id: 2,
          name: 'Product 2',
          description: 'Description 2',
          price: 200,
          averageRating: 4,
        },
      ]);
    });

    it('should fall back to database average rating if Redis fails', async () => {
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
      mockRedisService.getProductData.mockRejectedValue(
        new Error('Redis Error'),
      );

      mockProductRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ averageRating: '4.5' }),
      });

      const result = await service.findAll();

      expect(productRepository.find).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: 1,
          name: 'Product 1',
          description: 'Description 1',
          price: 100,
          averageRating: 4.5,
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
      mockRedisService.getProductData.mockResolvedValue({ averageRating: 5 });

      const result = await service.findOne(1);

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({
        id: 1,
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
        averageRating: 5,
      });
    });

    it('should throw NotFoundException if product is not found', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should fall back to database average rating if Redis fails', async () => {
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
      mockRedisService.getProductData.mockRejectedValue(
        new Error('Redis Error'),
      );

      mockProductRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ averageRating: '4.2' }),
      });

      const result = await service.findOne(1);

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({
        id: 1,
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
        averageRating: 4.2,
      });
    });
  });

  describe('update', () => {
    it('should update and save a product', async () => {
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product',
        description: 'Updated Description',
        price: 150,
      };

      const mockProduct = {
        id: 1,
        ...updateProductDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      } as Product;

      mockProductRepository.preload.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);

      const result = await service.update(1, updateProductDto);

      expect(productRepository.preload).toHaveBeenCalledWith({
        id: 1,
        ...updateProductDto,
      });
      expect(productRepository.save).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product to update is not found', async () => {
      mockProductRepository.preload.mockResolvedValue(null);

      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product',
        description: 'Updated Description',
        price: 150,
      };

      await expect(service.update(1, updateProductDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(productRepository.preload).toHaveBeenCalledWith({
        id: 1,
        ...updateProductDto,
      });
    });
  });

  describe('remove', () => {
    it('should delete a product', async () => {
      mockProductRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(1);

      expect(productRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if product to delete is not found', async () => {
      mockProductRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
      expect(productRepository.delete).toHaveBeenCalledWith(1);
    });
  });
});
