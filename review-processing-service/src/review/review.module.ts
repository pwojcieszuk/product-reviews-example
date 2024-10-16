import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { RedisModule } from 'src/redis/redis.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  providers: [ReviewService],
  imports: [RedisModule, DatabaseModule],
})
export class ReviewModule {}
