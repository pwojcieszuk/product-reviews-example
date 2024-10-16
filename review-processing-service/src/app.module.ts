import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from './redis/redis.module';
import { DatabaseModule } from './database/database.module';
import { BullmqModule } from './bullmq/bullmq.module';
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
        synchronize: true, // TODO DO NOT USE IN PRODUCTION
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    DatabaseModule,
    BullmqModule,
  ],
})
export class AppModule {}
