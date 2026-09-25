import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { TenantsModule } from './tenants/tenants.module';
import { TenanciesModule } from './tenancies/tenancies.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentAllocationsModule } from './payment-allocations/payment-allocations.module';
import { PaymentsModule } from './payments/payments.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { DocumentsModule } from './documents/documents.module';
import { ReportsModule } from './reports/reports.module';
import { QueuesModule } from './queues/queues.module';
// import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    TenantsModule,
    TenanciesModule,
    InvoicesModule,
    PaymentAllocationsModule,
    PaymentsModule,
    ReceiptsModule,
    DocumentsModule,
    ReportsModule,
    QueuesModule,
    // JobsModule,
  ],
})
export class AppModule {}