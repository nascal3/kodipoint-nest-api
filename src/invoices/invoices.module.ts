import { Module } from '@nestjs/common';

import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { AuthModule } from '@/auth/auth.module';
import { RabbitMqModule } from '@/queues/rabbitmq.module';

@Module({
  imports: [AuthModule, RabbitMqModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
