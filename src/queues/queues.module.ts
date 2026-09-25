import { Module } from '@nestjs/common';
import { SmsProcessor } from './sms.processor';
import { EmailProcessor } from './email.processor';
import { QueuesController } from './queues.controller';
import { DocumentsModule } from '@/documents/documents.module';
import { RabbitMqModule } from './rabbitmq.module';

@Module({
  imports: [DocumentsModule, RabbitMqModule],
  controllers: [QueuesController],
  providers: [SmsProcessor, EmailProcessor],
  exports: [RabbitMqModule, SmsProcessor, EmailProcessor],
})
export class QueuesModule {}
