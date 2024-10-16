import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EachMessagePayload, type Consumer } from 'kafkajs';
import { BullmqService } from 'src/bullmq/bullmq.service';

@Injectable()
export class EventProcessingService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly bullmqService: BullmqService,
    @Inject('KAFKA_CONSUMER') private readonly kafkaConsumer: Consumer,
  ) {}

  async onModuleInit() {
    await this.kafkaConsumer.subscribe({
      topic: this.configService.get<string>('kafka.topic'),
    });

    await this.kafkaConsumer.run({
      eachMessage: async (messagePayload: EachMessagePayload) => {
        const eventKey = messagePayload.message.key.toString();
        const eventValue = JSON.parse(messagePayload.message.value.toString());

        const reviewAddedEvent = this.configService.get<string>(
          'kafka.events.reviewAdded',
        );
        const reviewUpdatedEvent = this.configService.get<string>(
          'kafka.events.reviewUpdated',
        );
        const reviewRemovedEvent = this.configService.get<string>(
          'kafka.events.reviewDeleted',
        );

        // Handle review-added event
        if (eventKey === reviewAddedEvent) {
          await this.bullmqService.addReviewJob(reviewAddedEvent, eventValue);
        }

        // Handle review-updated event
        if (eventKey === reviewUpdatedEvent) {
          await this.bullmqService.addReviewJob(reviewUpdatedEvent, eventValue);
        }

        // Handle review-deleted event
        if (eventKey === reviewRemovedEvent) {
          await this.bullmqService.addReviewJob(reviewRemovedEvent, eventValue);
        }
      },
    });
  }
}
