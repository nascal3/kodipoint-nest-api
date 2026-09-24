import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Res,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import * as authenticatedUserType from '@/common/types/authenticated-user.type';

import { DocumentsService } from './documents.service';
import { SendDocumentDto } from './dto/send-document.dto';

@ApiTags('Documents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({
    path: 'documents',
    version: '1',
})
export class DocumentsController {
    constructor(
        private readonly documentsService: DocumentsService,
    ) {}

    /* ========================== INVOICES ============================ */

    @Get('invoices/:invoiceId/pdf')
    @ApiOperation({ summary: 'Download an invoice PDF' })
    @ApiParam({ name: 'invoiceId', example: 'invoice-uuid' })
    async downloadInvoicePdf(
        @CurrentUser()
        user: authenticatedUserType.AuthenticatedUser,
        @Param('invoiceId') invoiceId: string,
        @Res() res: Response,
    ): Promise<void> {
        const doc = await this.documentsService.generateInvoicePdf(
            user.id,
            invoiceId,
        );

        res.set({
            'Content-Type': doc.contentType,
            'Content-Disposition': `attachment; filename="${doc.filename}"`,
            'Content-Length': String(doc.buffer.length),
        });
        res.end(doc.buffer);
    }

    @Post('invoices/:invoiceId/pdf/email')
    @ApiOperation({ summary: 'Email an invoice PDF to the tenant' })
    @ApiParam({ name: 'invoiceId', example: 'invoice-uuid' })
    emailInvoicePdf(
        @CurrentUser()
        user: authenticatedUserType.AuthenticatedUser,
        @Param('invoiceId') invoiceId: string,
        @Body() dto: SendDocumentDto,
    ) {
        return this.documentsService.emailInvoicePdf(
            user.id,
            invoiceId,
            dto,
        );
    }

    @Post('invoices/:invoiceId/pdf/sms')
    @ApiOperation({ summary: 'Send SMS notification about an invoice PDF to the tenant' })
    @ApiParam({ name: 'invoiceId', example: 'invoice-uuid' })
    smsInvoicePdf(
        @CurrentUser()
        user: authenticatedUserType.AuthenticatedUser,
        @Param('invoiceId') invoiceId: string,
        @Body() dto: SendDocumentDto,
    ) {
        return this.documentsService.smsInvoicePdf(
            user.id,
            invoiceId,
            dto,
        );
    }

    /* ========================== RECEIPTS ============================ */

    @Get('receipts/:receiptId/pdf')
    @ApiOperation({ summary: 'Download a receipt PDF' })
    @ApiParam({ name: 'receiptId', example: 'receipt-uuid' })
    async downloadReceiptPdf(
        @CurrentUser()
        user: authenticatedUserType.AuthenticatedUser,
        @Param('receiptId') receiptId: string,
        @Res() res: Response,
    ): Promise<void> {
        const doc = await this.documentsService.generateReceiptPdf(
            user.id,
            receiptId,
        );

        res.set({
            'Content-Type': doc.contentType,
            'Content-Disposition': `attachment; filename="${doc.filename}"`,
            'Content-Length': String(doc.buffer.length),
        });
        res.end(doc.buffer);
    }

    @Post('receipts/:receiptId/pdf/email')
    @ApiOperation({ summary: 'Email a receipt PDF to the tenant' })
    @ApiParam({ name: 'receiptId', example: 'receipt-uuid' })
    emailReceiptPdf(
        @CurrentUser()
        user: authenticatedUserType.AuthenticatedUser,
        @Param('receiptId') receiptId: string,
        @Body() dto: SendDocumentDto,
    ) {
        return this.documentsService.emailReceiptPdf(
            user.id,
            receiptId,
            dto,
        );
    }

    @Post('receipts/:receiptId/pdf/sms')
    @ApiOperation({ summary: 'Send SMS notification about a receipt PDF to the tenant' })
    @ApiParam({ name: 'receiptId', example: 'receipt-uuid' })
    smsReceiptPdf(
        @CurrentUser()
        user: authenticatedUserType.AuthenticatedUser,
        @Param('receiptId') receiptId: string,
        @Body() dto: SendDocumentDto,
    ) {
        return this.documentsService.smsReceiptPdf(
            user.id,
            receiptId,
            dto,
        );
    }
}