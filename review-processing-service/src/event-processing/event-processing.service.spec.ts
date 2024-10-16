import { Test, TestingModule } from '@nestjs/testing';
import { EventProcessingService } from './event-processing.service';
import { ConfigService } from '@nestjs/config';
import { BullmqService } from 'src/bullmq/bullmq.service';
import { Consumer, EachMessagePayload } from 'kafkajs';

describe('EventProcessingService', () => {
  let service: EventProcessingService;
  let kafkaConsumerMock: Partial<Consumer>;
  let bullmqServiceMock: Partial<BullmqService>;
  let configServiceMock: Partial<ConfigService>;

  beforeEach(async () => {
    kafkaConsumerMock = {
      subscribe: jest.fn(),
      run: jest.fn(),
    };

    bullmqServiceMock = {
      addReviewJob: jest.fn(),
    };

    configServiceMock = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventProcessingService,
        { provide: 'KAFKA_CONSUMER', useValue: kafkaConsumerMock as Consumer },
        {
          provide: BullmqService,
          useValue: bullmqServiceMock as BullmqService,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock as ConfigService,
        },
      ],
    }).compile();

    service = module.get<EventProcessingService>(EventProcessingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should subscribe to the correct Kafka topic and run consumer', async () => {
      configServiceMock.get = jest.fn((key: string) => {
        if (key === 'kafka.topic') return 'review-events';
        if (key === 'kafka.events.reviewAdded') return 'review-added';
        return null;
      });

      await service.onModuleInit();

      expect(kafkaConsumerMock.subscribe).toHaveBeenCalledWith({
        topic: 'review-events',
      });

      // Mock Kafka message with additional required properties
      const messagePayload: EachMessagePayload = {
        topic: 'review-events',
        partition: 0,
        message: {
          key: Buffer.from('review-added'),
          value: Buffer.from(JSON.stringify({ productId: 1, rating: 5 })),
          offset: '1',
          headers: {},
          timestamp: Date.now().toString(),
          attributes: 0,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      };

      // Simulate Kafka message processing
      const runConsumerCallback = (kafkaConsumerMock.run as jest.Mock).mock
        .calls[0][0].eachMessage;
      await runConsumerCallback(messagePayload);

      // Check that the correct job was added to BullMQ
      expect(bullmqServiceMock.addReviewJob).toHaveBeenCalledWith(
        'review-added',
        { productId: 1, rating: 5 },
      );
    });

    it('should not enqueue jobs if the event key does not match', async () => {
      configServiceMock.get = jest.fn((key: string) => {
        if (key === 'kafka.topic') return 'review-events';
        if (key === 'kafka.events.reviewAdded') return 'review-added';
        return null;
      });

      await service.onModuleInit();

      const messagePayload: EachMessagePayload = {
        topic: 'review-events',
        partition: 0,
        message: {
          key: Buffer.from('some-other-event'),
          value: Buffer.from(JSON.stringify({ productId: 1, rating: 5 })),
          offset: '1',
          headers: {},
          timestamp: Date.now().toString(),
          attributes: 0,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(), // Mock the pause function
      };

      const runConsumerCallback = (kafkaConsumerMock.run as jest.Mock).mock
        .calls[0][0].eachMessage;
      await runConsumerCallback(messagePayload);

      expect(bullmqServiceMock.addReviewJob).not.toHaveBeenCalled();
    });
  });
});
