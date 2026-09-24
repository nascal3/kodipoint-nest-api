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

@Module({
    imports: [
        AuthModule,
        DatabaseModule,
        InvoicesModule,
        ReceiptsModule,
    ],
    controllers: [DocumentsController],
    providers: [DocumentsService, PdfService, EmailService, SmsService],
    exports: [DocumentsService],
})
export class DocumentsModule {}