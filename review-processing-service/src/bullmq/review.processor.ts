import { Injectable, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { ReviewService } from 'src/review/review.service';

@Processor('review-processing')
@Injectable()
export class ReviewProcessor extends WorkerHost implements OnModuleInit {
  private reviewAddedJobName: string;

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
  }

  async process(job: Job) {
    if (job.name === this.reviewAddedJobName) {
      await this.handleReviewAdded(job);
    }
  }

  private async handleReviewAdded(job: Job) {
    await this.reviewService.processReviewAdded(job);
  }
}
