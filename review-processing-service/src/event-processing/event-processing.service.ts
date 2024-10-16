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

        if (
          eventKey ===
          this.configService.get<string>('kafka.events.reviewAdded')
        ) {
          // Enqueue the event as a job in BullMQ
          await this.bullmqService.addReviewJob(
            this.configService.get<string>('kafka.events.reviewAdded'),
            eventValue,
          );
        }
      },
    });
  }
}
