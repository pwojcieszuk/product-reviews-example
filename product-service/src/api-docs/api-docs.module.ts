import { INestApplication, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

@Module({
  imports: [ConfigModule],
})
export class ApiDocsModule {
  static setup(app: INestApplication) {
    const configService = app.get(ConfigService);
    const active = configService.get<boolean>('apiDocs.active');

    if (!active) {
      return;
    }

    const path = configService.get<string>('apiDocs.path');

    const builder = new DocumentBuilder()
      .setTitle('Product Service API')
      .setDescription('Product Service API description')
      .setVersion('0.1');

    const config = builder.build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup(path, app, document);
  }
}
