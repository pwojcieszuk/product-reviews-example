import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class BullmqService {
  constructor(
    @InjectQueue('review-processing') private readonly reviewQueue: Queue,
  ) {}

  async addReviewJob(jobName: string, data: any): Promise<void> {
    await this.reviewQueue.add(jobName, data);
  }
}
