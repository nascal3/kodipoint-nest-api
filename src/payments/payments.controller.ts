import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import * as authenticatedUserType from '@/common/types/authenticated-user.type';

import {CreatePaymentDto} from './dto/create-payment.dto';
import {PaymentsService} from './payments.service';
import {AllocatePaymentDto} from "@/payments/dto/allocate-payment.dto";

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({
    path: 'payments',
    version: '1',
})
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
    ) {}

    @Post()
    create(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Body() dto: CreatePaymentDto,
    ) {
        return this.paymentsService.create(
            user.id,
            dto,
        );
    }

    @Get()
    findAll(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    ) {
        return this.paymentsService.findAll(
            user.id,
        );
    }

    @Get(':id')
    findOne(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') paymentId: string,
    ) {
        return this.paymentsService.findOne(
            user.id,
            paymentId,
        );
    }

    @Post(':id/reverse')
    reverse(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') paymentId: string,
    ) {
        return this.paymentsService.reversePayment(
            user.id,
            paymentId,
        );
    }

    @Post(':id/allocations')
    allocate(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') paymentId: string,
        @Body() dto: AllocatePaymentDto,
    ) {
        return this.paymentsService.allocateExistingPayment(
            user.id,
            paymentId,
            dto.invoiceId,
            dto.amount.toString(),
            dto.notes,
        );
    }
}