import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { BullmqModule } from 'src/bullmq/bullmq.module';
import { RedisModule } from 'src/redis/redis.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  providers: [ReviewService],
  imports: [BullmqModule, RedisModule, DatabaseModule],
})
export class ReviewModule {}
