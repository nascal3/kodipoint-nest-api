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
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import * as authenticatedUserType from '@/common/types/authenticated-user.type';

import {CreatePaymentDto} from './dto/create-payment.dto';
import {PaymentsService} from './payments.service';
import {AllocatePaymentDto} from "@/payment-allocations/dto/allocate-payment.dto";

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
    @ApiOperation({ summary: 'Create a new payment' })
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
    @ApiOperation({ summary: 'List all payments for the authenticated manager' })
    findAll(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    ) {
        return this.paymentsService.findAll(
            user.id,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single payment by ID' })
    @ApiParam({ name: 'id', example: 'payment-uuid' })
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
    @ApiOperation({ summary: 'Reverse a payment' })
    @ApiParam({ name: 'id', example: 'payment-uuid' })
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
    @ApiOperation({ summary: 'Allocate an existing payment to an invoice' })
    @ApiParam({ name: 'id', example: 'payment-uuid' })
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
            dto.idempotencyKey,
        );
    }
}