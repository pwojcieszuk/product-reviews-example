import { Injectable, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { ReviewService } from 'src/review/review.service';

@Processor('review-processing')
@Injectable()
export class ReviewProcessor extends WorkerHost implements OnModuleInit {
  private reviewAddedJobName: string;
  private reviewUpdatedJobName: string;
  private reviewRemovedJobName: string;
  private jobHandlers: Record<string, (job: Job) => Promise<void>>;

  constructor(
    private readonly configService: ConfigService,
    private readonly reviewService: ReviewService,
  ) {
    super();
  }

  async onModuleInit() {
    this.reviewAddedJobName = this.configService.get<string>(
      'kafka.events.reviewAdded',
    );
    this.reviewUpdatedJobName = this.configService.get<string>(
      'kafka.events.reviewUpdated',
    );
    this.reviewRemovedJobName = this.configService.get<string>(
      'kafka.events.reviewDeleted',
    );

    this.jobHandlers = {
      [this.reviewAddedJobName]: this.handleReviewAdded.bind(this),
      [this.reviewUpdatedJobName]: this.handleReviewUpdated.bind(this),
      [this.reviewRemovedJobName]: this.handleReviewRemoved.bind(this),
    };
  }

  async process(job: Job) {
    const handler = this.jobHandlers[job.name];

    if (handler) {
      await handler(job);
    } else {
      console.warn(`No handler found for job: ${job.name}`);
    }
  }

  private async handleReviewAdded(job: Job) {
    await this.reviewService.processReviewAdded(job);
  }

  private async handleReviewUpdated(job: Job) {
    await this.reviewService.processReviewUpdated(job);
  }

  private async handleReviewRemoved(job: Job) {
    await this.reviewService.processReviewRemoved(job);
  }
}
