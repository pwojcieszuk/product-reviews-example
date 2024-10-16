import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { NotFoundException } from '@nestjs/common';

describe('ProductController', () => {
  let controller: ProductController;
  let productService: ProductService;

  const mockProductService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    productService = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
      };

      const mockProductResponse: ProductResponseDto = {
        id: 1,
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
      };

      mockProductService.create.mockResolvedValue(mockProductResponse);

      const result = await controller.create(createProductDto);

      expect(productService.create).toHaveBeenCalledWith(createProductDto);
      expect(result).toEqual(mockProductResponse);
    });
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const mockProductResponse: ProductResponseDto[] = [
        {
          id: 1,
          name: 'Product 1',
          description: 'Description 1',
          price: 100,
        },
        {
          id: 2,
          name: 'Product 2',
          description: 'Description 2',
          price: 200,
        },
      ];

      mockProductService.findAll.mockResolvedValue(mockProductResponse);

      const result = await controller.findAll();

      expect(productService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockProductResponse);
    });
  });

  describe('findOne', () => {
    it('should return a single product', async () => {
      const mockProductResponse: ProductResponseDto = {
        id: 1,
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
      };

      mockProductService.findOne.mockResolvedValue(mockProductResponse);

      const result = await controller.findOne('1');

      expect(productService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProductResponse);
    });

    it('should throw NotFoundException if product is not found', async () => {
      mockProductService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product',
        description: 'Updated Description',
        price: 150,
      };

      const mockProductResponse: ProductResponseDto = {
        id: 1,
        name: 'Updated Product',
        description: 'Updated Description',
        price: 150,
      };

      mockProductService.update.mockResolvedValue(mockProductResponse);

      const result = await controller.update('1', updateProductDto);

      expect(productService.update).toHaveBeenCalledWith(1, updateProductDto);
      expect(result).toEqual(mockProductResponse);
    });

    it('should throw NotFoundException if product is not found', async () => {
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product',
        description: 'Updated Description',
        price: 150,
      };

      mockProductService.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update('1', updateProductDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a product', async () => {
      mockProductService.remove.mockResolvedValue(undefined);

      await controller.remove('1');

      expect(productService.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if product is not found', async () => {
      mockProductService.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.remove('1')).rejects.toThrow(NotFoundException);
    });
  });
});
