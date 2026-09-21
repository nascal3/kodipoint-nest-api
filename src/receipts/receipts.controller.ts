import {
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

import {ReceiptsService} from './receipts.service';

@ApiTags('Receipts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({
    path: 'receipts',
    version: '1',
})
export class ReceiptsController {
    constructor(
        private readonly receiptsService: ReceiptsService,
    ) {}

    @Post('payment/:paymentId')
    @ApiOperation({
        summary:
            'Create a receipt for a successful payment',
    })
    @ApiParam({
        name: 'paymentId',
        description: 'Payment ID',
        example: 'payment-uuid',
    })
    createForPayment(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('paymentId') paymentId: string,
    ) {
        return this.receiptsService.createForPayment(
            user.id,
            paymentId,
        );
    }

    @Get()
    @ApiOperation({
        summary: 'List manager receipts',
    })
    findAll(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    ) {
        return this.receiptsService.findAll(
            user.id,
        );
    }

    @Get('payment/:paymentId')
    @ApiOperation({
        summary: 'Get receipt by payment',
    })
    @ApiParam({
        name: 'paymentId',
        description: 'Payment ID',
        example: 'payment-uuid',
    })
    findByPayment(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('paymentId') paymentId: string,
    ) {
        return this.receiptsService.findByPayment(
            user.id,
            paymentId,
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get one receipt',
    })
    @ApiParam({
        name: 'id',
        description: 'Receipt ID',
        example: 'receipt-uuid',
    })
    findOne(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') receiptId: string,
    ) {
        return this.receiptsService.findOne(
            user.id,
            receiptId,
        );
    }
}