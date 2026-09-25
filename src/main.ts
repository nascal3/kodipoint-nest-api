import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

import { AppModule } from './app.module';
import {HttpExceptionFilter} from "@/common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
    });

  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
  );

  app.enableCors();

    app.useGlobalFilters(
        new HttpExceptionFilter(),
    );

  // Connect to RabbitMQ for microservices
  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'kodipoint_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Property Management API')
      .setDescription(
          'API for managing properties, tenants, tenancies, invoices, payments and receipts.',
      )
      .setVersion('1.0')
      .addBearerAuth(
          {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'Enter your JWT access token',
          },
          'access-token',
      )
      .build();

  const swaggerDocument = SwaggerModule.createDocument(
      app,
      swaggerConfig,
  );

  SwaggerModule.setup('docs', app, swaggerDocument, {
      swaggerOptions: {
          persistAuthorization: true,
          yamlDocumentUrl: 'docs-yaml'
      }
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();