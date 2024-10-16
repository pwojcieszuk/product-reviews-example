import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { type Producer } from 'kafkajs';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Product } from 'src/product/entities/product.entity';
import { Review } from './entities/review.entity';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject('KAFKA_PRODUCER') private readonly kafkaProducer: Producer,
  ) {}

  async create(createReviewDto: CreateReviewDto): Promise<Review> {
    const { productId, ...reviewData } = createReviewDto;

    const product = await this.productRepository.findOneBy({ id: productId });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const review = this.reviewRepository.create({
      ...reviewData,
      product,
    });

    await this.reviewRepository.save(review);

    await this.emitReviewEvent(
      'review-added',
      review.id,
      productId,
      review.rating,
    );

    return review;
  }

  async update(id: number, updateReviewDto: UpdateReviewDto): Promise<Review> {
    const existingReview = await this.reviewRepository.findOneBy({ id });

    if (!existingReview) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    const updatedRating = updateReviewDto.rating;
    const ratingChanged = updatedRating !== existingReview.rating;

    const updatedReview = await this.reviewRepository.preload({
      id: +id,
      ...updateReviewDto,
    });

    if (!updatedReview) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    await this.reviewRepository.save(updatedReview);

    if (ratingChanged) {
      await this.emitReviewEvent(
        'review-updated',
        updatedReview.id,
        updatedReview.product.id,
        updatedRating,
      );
    }

    return updatedReview;
  }

  async remove(id: number): Promise<void> {
    const review = await this.reviewRepository.findOneBy({ id });
    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    await this.reviewRepository.delete(id);

    await this.emitReviewEvent('review-deleted', id, review.product.id);
  }

  private async emitReviewEvent(
    eventType: 'review-added' | 'review-updated' | 'review-deleted',
    reviewId: number,
    productId: number,
    rating?: number,
  ) {
    const eventPayload: any = { productId, reviewId };
    if (rating !== undefined) {
      eventPayload.rating = rating;
    }

    await this.kafkaProducer.send({
      topic: 'review-events',
      messages: [
        {
          key: eventType,
          value: JSON.stringify(eventPayload),
        },
      ],
    });
  }
}
