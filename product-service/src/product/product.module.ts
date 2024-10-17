import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { RedisModule } from 'src/redis/redis.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ReviewModule } from 'src/review/review.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), RedisModule, ReviewModule],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
