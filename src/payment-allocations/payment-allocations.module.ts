import { Module } from '@nestjs/common';

import { PaymentAllocationsController } from './payment-allocations.controller';
import { PaymentAllocationsService } from './payment-allocations.service';
import {AuthModule} from "@/auth/auth.module";

@Module({
    imports: [AuthModule],
    controllers: [PaymentAllocationsController],
    providers: [PaymentAllocationsService],
    exports: [PaymentAllocationsService],
})
export class PaymentAllocationsModule {}