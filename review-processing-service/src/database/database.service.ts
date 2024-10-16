import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectRepository(Review) private reviewRepository: Repository<Review>,
  ) {}

  async getProductReviews(
    productId: number,
  ): Promise<{ averageRating: number; reviewCount: number }> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'averageRating')
      .addSelect('COUNT(review.id)', 'reviewCount')
      .where('review.productId = :productId', { productId })
      .getRawOne();

    const averageRating = parseFloat(result.averageRating) || 0;
    const reviewCount = parseInt(result.reviewCount, 10) || 0;

    return { averageRating, reviewCount };
  }
}
