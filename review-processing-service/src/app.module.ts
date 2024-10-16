import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewModule } from './review/review.module';
import { RedisModule } from './redis/redis.module';
import { DatabaseModule } from './database/database.module';
import { BullmqModule } from './bullmq/bullmq.module';
import { EventProcessingModule } from './event-processing/event-processing.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '../.env',
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [],
        synchronize: false,
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    ReviewModule,
    RedisModule,
    DatabaseModule,
    BullmqModule,
    EventProcessingModule,
  ],
})
export class AppModule {}
