import { Module } from '@nestjs/common';
import {PaymentsController} from "@/payments/payments.controller";
import {PaymentsService} from "@/payments/payments.service";
import {AuthModule} from "@/auth/auth.module";

@Module({
    imports: [AuthModule],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule {}
