import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { DatabaseService } from '../database/database.service';
import { type Job } from 'bullmq';

@Injectable()
export class ReviewService {
  constructor(
    private readonly redisService: RedisService,
    private readonly dbService: DatabaseService,
  ) {}

  async processReviewAdded(job: Job) {
    const { productId, rating } = job.data;

    // Fetch product data from Redis or DB if cache missed
    let { averageRating, reviewCount } =
      await this.redisService.getProductData(productId);

    if (!averageRating) {
      ({ averageRating, reviewCount } =
        await this.dbService.getProductReviews(productId));
    }

    // Recalculate the average rating
    const newReviewCount = reviewCount + 1;
    const newAverageRating =
      (averageRating * reviewCount + rating) / newReviewCount;

    // Update Redis cache and database
    await this.redisService.updateProductData(
      productId,
      newAverageRating,
      newReviewCount,
    );
  }

  // processReviewRemoved, processReviewUpdated
}
