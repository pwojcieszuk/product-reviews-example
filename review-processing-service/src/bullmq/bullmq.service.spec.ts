import { Test, TestingModule } from '@nestjs/testing';
import { BullmqService } from './bullmq.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

describe('BullmqService', () => {
  let service: BullmqService;
  let reviewQueue: Queue;

  const mockReviewQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BullmqService,
        {
          provide: getQueueToken('review-processing'),
          useValue: mockReviewQueue,
        },
      ],
    }).compile();

    service = module.get<BullmqService>(BullmqService);
    reviewQueue = module.get<Queue>(getQueueToken('review-processing'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addReviewJob', () => {
    it('should add a job to the BullMQ queue', async () => {
      const jobName = 'review-added';
      const jobData = { productId: 1, rating: 5 };

      await service.addReviewJob(jobName, jobData);

      expect(reviewQueue.add).toHaveBeenCalledWith(jobName, jobData);
      expect(reviewQueue.add).toHaveBeenCalledTimes(1);
    });
  });
});
