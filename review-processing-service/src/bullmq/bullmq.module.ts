import { Module } from '@nestjs/common';
import { BullmqService } from './bullmq.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'review-processing',
    }),
  ],
  providers: [BullmqService],
  exports: [BullmqService],
})
export class BullmqModule {}
