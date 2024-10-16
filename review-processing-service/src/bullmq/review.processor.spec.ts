import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReviewService } from 'src/review/review.service';
import { Job } from 'bullmq';
import { ReviewProcessor } from './review.processor';

describe('ReviewProcessor', () => {
  let processor: ReviewProcessor;
  let configServiceMock: Partial<ConfigService>;
  let reviewServiceMock: Partial<ReviewService>;
  let jobHandlersMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    configServiceMock = {
      get: jest.fn(),
    };

    reviewServiceMock = {
      processReviewAdded: jest.fn(),
      processReviewUpdated: jest.fn(),
      processReviewRemoved: jest.fn(),
    };

    // Initialize the jobHandlers mock
    jobHandlersMock = {
      'review-added': jest.fn(),
      'review-updated': jest.fn(),
      'review-removed': jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewProcessor,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: ReviewService, useValue: reviewServiceMock },
      ],
    }).compile();

    processor = module.get<ReviewProcessor>(ReviewProcessor);

    // Manually set the jobHandlers in the processor
    processor['jobHandlers'] = jobHandlersMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should load the job names from config', async () => {
      // Mock the configService to return specific job names
      configServiceMock.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'kafka.events.reviewAdded') return 'review-added';
        if (key === 'kafka.events.reviewUpdated') return 'review-updated';
        if (key === 'kafka.events.reviewDeleted') return 'review-removed';
      });

      // Call onModuleInit to load the job names
      await processor.onModuleInit();

      // Ensure that the config service was called with the right keys
      expect(configServiceMock.get).toHaveBeenCalledWith(
        'kafka.events.reviewAdded',
      );
      expect(configServiceMock.get).toHaveBeenCalledWith(
        'kafka.events.reviewUpdated',
      );
      expect(configServiceMock.get).toHaveBeenCalledWith(
        'kafka.events.reviewDeleted',
      );

      // Check that the job names were set correctly
      expect(processor['reviewAddedJobName']).toBe('review-added');
      expect(processor['reviewUpdatedJobName']).toBe('review-updated');
      expect(processor['reviewRemovedJobName']).toBe('review-removed');
    });
  });

  describe('process', () => {
    it('should call the correct job handler when job name matches', async () => {
      // Mock a job with the name 'review-added'
      const mockJob = {
        name: 'review-added',
        data: { productId: 1, rating: 5 },
      } as Job;

      // Set the handler for the 'review-added' job
      jobHandlersMock['review-added'] = jest.fn();

      // Call the process method
      await processor.process(mockJob);

      // Ensure that the handler for 'review-added' was called
      expect(jobHandlersMock['review-added']).toHaveBeenCalledWith(mockJob);
    });

    it('should not call any handler when job name does not match', async () => {
      // Mock a job with a non-matching name
      const mockJob = {
        name: 'non-matching-job',
        data: { productId: 1 },
      } as Job;

      // Call the process method
      await processor.process(mockJob);

      // Ensure no job handler was called
      expect(jobHandlersMock['review-added']).not.toHaveBeenCalled();
      expect(jobHandlersMock['review-updated']).not.toHaveBeenCalled();
      expect(jobHandlersMock['review-removed']).not.toHaveBeenCalled();
    });
  });

  describe('handleReviewAdded', () => {
    it('should call processReviewAdded in ReviewService', async () => {
      // Mock a job
      const mockJob = {
        name: 'review-added',
        data: { productId: 1, rating: 5 },
      } as Job;

      // Call the handleReviewAdded method
      await processor['handleReviewAdded'](mockJob);

      // Ensure ReviewService's processReviewAdded was called
      expect(reviewServiceMock.processReviewAdded).toHaveBeenCalledWith(
        mockJob,
      );
    });
  });

  describe('handleReviewUpdated', () => {
    it('should call processReviewUpdated in ReviewService', async () => {
      // Mock a job
      const mockJob = {
        name: 'review-updated',
        data: { productId: 1, oldRating: 4, newRating: 5 },
      } as Job;

      // Call the handleReviewUpdated method
      await processor['handleReviewUpdated'](mockJob);

      // Ensure ReviewService's processReviewUpdated was called
      expect(reviewServiceMock.processReviewUpdated).toHaveBeenCalledWith(
        mockJob,
      );
    });
  });

  describe('handleReviewRemoved', () => {
    it('should call processReviewRemoved in ReviewService', async () => {
      // Mock a job
      const mockJob = {
        name: 'review-removed',
        data: { productId: 1, rating: 5 },
      } as Job;

      // Call the handleReviewRemoved method
      await processor['handleReviewRemoved'](mockJob);

      // Ensure ReviewService's processReviewRemoved was called
      expect(reviewServiceMock.processReviewRemoved).toHaveBeenCalledWith(
        mockJob,
      );
    });
  });
});
