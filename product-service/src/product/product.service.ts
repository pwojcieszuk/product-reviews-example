import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RedisService } from 'src/redis/redis.service';
import { ReviewService } from 'src/review/review.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly redisService: RedisService,
    private readonly reviewService: ReviewService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(createProductDto);
    await this.productRepository.save(product);
    return product;
  }

  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.productRepository.find();
    const productDtos = await Promise.all(
      products.map((product) => this.mapProductToResponseDto(product)),
    );
    return productDtos;
  }

  async findOne(id: number): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return this.mapProductToResponseDto(product);
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.productRepository.preload({
      id,
      ...updateProductDto,
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.productRepository.save(product);
    return product;
  }

  async remove(id: number): Promise<void> {
    const result = await this.productRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
  }

  // Helper method to fetch the average rating of a product directly from db
  // This method is used as a fallback when Redis cache is empty
  // TODO this is just a proof of concept that shows we need a fallback for cache
  // Better strategy would be to persist the average rating in the database
  // but updating it every time a review is added or removed is a performance risk
  // and proper implementation would require a more complex solution
  // like a separate service that updates the average rating periodically
  // for the sake of proof of concept we will keep this method as is for now
  private async getProductAverageRating(productId: number): Promise<number> {
    return this.reviewService.getProductAverageRating(productId);
  }

  private async mapProductToResponseDto(
    product: Product,
  ): Promise<ProductResponseDto> {
    let averageRating: number | undefined;
    try {
      averageRating = await this.redisService.getProductAverageRating(
        product.id,
      );
    } catch (error) {
      // Ignore Redis errors and return undefined average rating
      console.error('Failed to fetch product data from Redis', error);
    }

    if (averageRating === undefined) {
      // Fallback to the average rating from the database
      averageRating = await this.getProductAverageRating(product.id);
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      averageRating,
    };
  }
}
