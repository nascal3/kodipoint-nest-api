import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { SendInvoiceDto } from './dto/send-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

type AuthenticatedUser = {
    id: string;
    email?: string;
};

@Controller({
    path: 'invoices',
    version: '1',
})
export class InvoicesController {
    constructor(
        private readonly invoicesService: InvoicesService,
    ) {}

    /**
     * Create an invoice for an active tenancy.
     *
     * POST /api/v1/invoices
     */
    @Post()
    create(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateInvoiceDto,
    ) {
        return this.invoicesService.create(user.id, dto);
    }

    /**
     * List invoices owned by the authenticated manager.
     *
     * GET /api/v1/invoices
     */
    @Get()
    findAll(
        @CurrentUser() user: AuthenticatedUser,
        @Query() query: ListInvoicesDto,
    ) {
        return this.invoicesService.findAll(
            user.id,
            query,
        );
    }

    /**
     * Get one invoice with line items and payments.
     *
     * GET /api/v1/invoices/:id
     */
    @Get(':id')
    findOne(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') invoiceId: string,
    ) {
        return this.invoicesService.findOne(
            user.id,
            invoiceId,
        );
    }

    /**
     * Edit a draft invoice.
     *
     * PATCH /api/v1/invoices/:id
     */
    @Patch(':id')
    update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') invoiceId: string,
        @Body() dto: UpdateInvoiceDto,
    ) {
        return this.invoicesService.update(
            user.id,
            invoiceId,
            dto,
        );
    }

    /**
     * Cancel an invoice.
     *
     * POST /api/v1/invoices/:id/cancel
     */
    @Post(':id/cancel')
    cancel(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') invoiceId: string,
    ) {
        return this.invoicesService.cancel(
            user.id,
            invoiceId,
        );
    }

    /**
     * Queue invoice delivery by email and/or SMS.
     *
     * POST /api/v1/invoices/:id/send
     */
    @Post(':id/send')
    send(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') invoiceId: string,
        @Body() dto: SendInvoiceDto,
    ) {
        return this.invoicesService.queueDelivery(
            user.id,
            invoiceId,
            dto,
        );
    }
}