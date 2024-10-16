import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { Review } from './entities/review.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  providers: [DatabaseService],
  imports: [TypeOrmModule.forFeature([Review])],
  exports: [DatabaseService],
})
export class DatabaseModule {}
