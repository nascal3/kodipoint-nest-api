import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { SendInvoiceDto } from './dto/send-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';
import * as authenticatedUserType from '@/common/types/authenticated-user.type';
import {JwtAuthGuard} from "@/common/guards/jwt-auth.guard";

@ApiTags('Invoices')
@ApiBearerAuth('access-token')
@Controller({
    path: 'invoices',
    version: '1',
})
@UseGuards(JwtAuthGuard)

export class InvoicesController {
    constructor(
        private readonly invoicesService: InvoicesService,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Create an invoice for an active tenancy' })
    create(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Body() dto: CreateInvoiceDto,
    ) {
        return this.invoicesService.create(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List invoices owned by the authenticated manager' })
    findAll(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Query() query: ListInvoicesDto,
    ) {
        return this.invoicesService.findAll(
            user.id,
            query,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one invoice with line items and payments' })
    findOne(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') invoiceId: string,
    ) {
        return this.invoicesService.findOne(
            user.id,
            invoiceId,
        );
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Edit a draft invoice' })
    update(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') invoiceId: string,
        @Body() dto: UpdateInvoiceDto,
    ) {
        return this.invoicesService.update(
            user.id,
            invoiceId,
            dto,
        );
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'Cancel an invoice' })
    cancel(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') invoiceId: string,
    ) {
        return this.invoicesService.cancel(
            user.id,
            invoiceId,
        );
    }

    @Post(':id/send')
    @ApiOperation({ summary: 'Queue invoice delivery by email and/or SMS' })
    send(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
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