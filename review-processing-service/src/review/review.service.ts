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

  async processReviewRemoved(job: Job) {
    const { productId, rating } = job.data;
    // Fetch product data from Redis or fallback to DB
    let { averageRating, reviewCount } =
      await this.redisService.getProductData(productId);

    if (!averageRating) {
      ({ averageRating, reviewCount } =
        await this.dbService.getProductReviews(productId));
    }

    // Ensure we don't divide by zero
    if (reviewCount <= 1) {
      await this.redisService.updateProductData(productId, 0, 0); // No reviews left
      return;
    }

    // Recalculate the average rating after removing a review
    const newReviewCount = reviewCount - 1;
    const newAverageRating =
      (averageRating * reviewCount - rating) / newReviewCount;

    // Update Redis cache and database
    await this.redisService.updateProductData(
      productId,
      newAverageRating,
      newReviewCount,
    );
  }

  async processReviewUpdated(job: Job) {
    const { productId, oldRating, rating: newRating } = job.data;

    // Fetch product data from Redis or fallback to DB
    let { averageRating, reviewCount } =
      await this.redisService.getProductData(productId);

    if (!averageRating) {
      ({ averageRating, reviewCount } =
        await this.dbService.getProductReviews(productId));
    }

    // Recalculate the average rating after updating the review
    const newAverageRating =
      (averageRating * reviewCount - oldRating + newRating) / reviewCount;

    // Update Redis cache and database
    await this.redisService.updateProductData(
      productId,
      newAverageRating,
      reviewCount,
    );
  }
}
