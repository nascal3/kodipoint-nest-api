import {
    Controller,
    Get,
    Param,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import * as authenticatedUserType from '@/common/types/authenticated-user.type';

import {PaymentAllocationsService} from './payment-allocations.service';

@ApiTags('Payment Allocations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({
    path: 'payment-allocations',
    version: '1',
})
export class PaymentAllocationsController {
    constructor(
        private readonly allocationsService: PaymentAllocationsService,
    ) {
    }

    @Get('payment/:paymentId')
    findByPayment(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('paymentId') paymentId: string,
    ) {
        return this.allocationsService.findByPayment(
            user.id,
            paymentId,
        );
    }

    @Get('invoice/:invoiceId')
    findByInvoice(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('invoiceId') invoiceId: string,
    ) {
        return this.allocationsService.findByInvoice(
            user.id,
            invoiceId,
        );
    }
}