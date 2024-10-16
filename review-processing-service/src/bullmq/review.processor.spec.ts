import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReviewService } from 'src/review/review.service';
import { Job } from 'bullmq';
import { ReviewProcessor } from './review.processor';

describe('ReviewProcessor', () => {
  let processor: ReviewProcessor;
  let configServiceMock: Partial<ConfigService>;
  let reviewServiceMock: Partial<ReviewService>;

  beforeEach(async () => {
    configServiceMock = {
      get: jest.fn(),
    };

    reviewServiceMock = {
      processReviewAdded: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewProcessor,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: ReviewService, useValue: reviewServiceMock },
      ],
    }).compile();

    processor = module.get<ReviewProcessor>(ReviewProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should load the reviewAddedJobName from config', async () => {
      // Mock the configService to return a specific job name
      configServiceMock.get = jest.fn().mockReturnValue('review-added');

      // Call onModuleInit to load the job name
      await processor.onModuleInit();

      // Ensure that the config service was called with the right key
      expect(configServiceMock.get).toHaveBeenCalledWith(
        'kafka.events.reviewAdded',
      );
      // Check that the reviewAddedJobName was set correctly
      expect(processor['reviewAddedJobName']).toBe('review-added');
    });
  });

  describe('process', () => {
    it('should call handleReviewAdded when job name matches', async () => {
      // Set the job name in the processor
      processor['reviewAddedJobName'] = 'review-added';

      // Create a mock job with the matching name
      const mockJob = {
        name: 'review-added',
        data: { productId: 1, rating: 5 },
      } as Job;

      const handleReviewAddedSpy = jest.spyOn(
        processor as any,
        'handleReviewAdded',
      );

      // Call the process method
      await processor.process(mockJob);

      // Ensure handleReviewAdded was called when the job name matches
      expect(handleReviewAddedSpy).toHaveBeenCalledWith(mockJob);
    });

    it('should not call handleReviewAdded when job name does not match', async () => {
      // Set a different job name in the processor
      processor['reviewAddedJobName'] = 'review-added';

      // Create a mock job with a non-matching name
      const mockJob = {
        name: 'review-updated',
        data: { productId: 1, rating: 5 },
      } as Job;

      // Spy on the handleReviewAdded method
      const handleReviewAddedSpy = jest.spyOn(
        processor as any,
        'handleReviewAdded',
      );

      // Call the process method
      await processor.process(mockJob);

      // Ensure handleReviewAdded was not called when the job name does not match
      expect(handleReviewAddedSpy).not.toHaveBeenCalled();
    });
  });

  describe('handleReviewAdded', () => {
    it('should call processReviewAdded in ReviewService', async () => {
      // Create a mock job
      const mockJob = {
        name: 'review-added',
        data: { productId: 1, rating: 5 },
      } as Job;

      // Call the handleReviewAdded method
      await (processor as any).handleReviewAdded(mockJob);

      // Ensure that ReviewService's processReviewAdded was called with the correct job
      expect(reviewServiceMock.processReviewAdded).toHaveBeenCalledWith(
        mockJob,
      );
    });
  });
});
