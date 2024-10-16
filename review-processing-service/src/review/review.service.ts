import { Injectable } from '@nestjs/common';
import { BullmqService } from '../bullmq/bullmq.service';
import { RedisService } from '../redis/redis.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ReviewService {
  constructor(
    private readonly bullmqService: BullmqService,
    private readonly redisService: RedisService,
    private readonly dbService: DatabaseService,
  ) {}

  async handleReviewAdded(review: any) {
    await this.bullmqService.addReviewJob('review-added', review);
  }

  async processReviewAdded(job: any) {
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

  // TODO handleReviewRemoved, handleReviewUpdated, processReviewRemoved, processReviewUpdated
}
