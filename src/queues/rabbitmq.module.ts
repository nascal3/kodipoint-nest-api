import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { QueuesService } from './queues.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>('RABBITMQ_URL') ||
                'amqp://localhost:5672',
            ],
            queue: 'kodipoint_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [QueuesService],
  exports: [ClientsModule, QueuesService],
})
export class RabbitMqModule {}
