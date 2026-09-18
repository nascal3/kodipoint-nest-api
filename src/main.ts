import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
  );

  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
      .setTitle('Property Management API')
      .setDescription(
          'Real-estate property, tenant, invoice, payment and receipt API',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

  const swaggerDocument = SwaggerModule.createDocument(
      app,
      swaggerConfig,
  );

  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();