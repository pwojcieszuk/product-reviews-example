import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { RedisModule } from 'src/redis/redis.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), RedisModule],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
