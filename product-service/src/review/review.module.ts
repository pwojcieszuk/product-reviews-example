import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Product } from 'src/product/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, Product]),
    ConfigModule.forRoot(),
  ],
  controllers: [ReviewController],
  providers: [
    ReviewService,
    {
      provide: 'KAFKA_PRODUCER',
      useFactory: async (configService: ConfigService): Promise<Producer> => {
        const kafka = new Kafka({
          clientId: configService.get<string>('kafka.clientId'),
          brokers: [
            `${configService.get<string>('kafka.broker')}:${configService.get<number>('kafka.port')}`,
          ],
        });
        const producer = kafka.producer();
        await producer.connect();
        return producer;
      },
    },
  ],
})
export class ReviewModule {}
