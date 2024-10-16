import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq'; // Import BullModule for BullMQ
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Consumer, Kafka } from 'kafkajs';
import { EventProcessingService } from './event-processing.service';
import { BullmqService } from 'src/bullmq/bullmq.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    BullModule.registerQueueAsync({
      name: 'review-processing',
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    BullmqService,
    EventProcessingService,
    {
      provide: 'KAFKA_CONSUMER',
      useFactory: async (configService: ConfigService): Promise<Consumer> => {
        const kafka = new Kafka({
          clientId: configService.get<string>('kafka.clientId'),
          brokers: [
            `${configService.get<string>('kafka.broker')}:${configService.get<number>('kafka.port')}`,
          ],
        });
        const consumer = kafka.consumer({
          groupId: configService.get<string>('kafka.groupId'),
        });
        await consumer.connect();
        return consumer;
      },
      inject: [ConfigService],
    },
  ],
})
export class EventProcessingModule {}
