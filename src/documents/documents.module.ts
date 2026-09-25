import { Module } from '@nestjs/common';

import { DatabaseModule } from '@/database/database.module';
import { InvoicesModule } from '@/invoices/invoices.module';
import { ReceiptsModule } from '@/receipts/receipts.module';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PdfService } from './pdf/pdf.service';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';
import {AuthModule} from "@/auth/auth.module";
import { RabbitMqModule } from '@/queues/rabbitmq.module';

@Module({
    imports: [
        AuthModule,
        DatabaseModule,
        InvoicesModule,
        ReceiptsModule,
        RabbitMqModule,
    ],
    controllers: [DocumentsController],
    providers: [DocumentsService, PdfService, EmailService, SmsService],
    exports: [DocumentsService, EmailService, SmsService],
})
export class DocumentsModule {}