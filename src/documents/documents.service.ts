import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '@/database/database.service';
import { InvoicesService } from '@/invoices/invoices.service';
import { ReceiptsService } from '@/receipts/receipts.service';

import { PdfService } from './pdf/pdf.service';
import { EmailService } from './email/email.service';
import { SendDocumentDto } from './dto/send-document.dto';
import { buildInvoicePdf } from './pdf/builders/invoice-pdf.builder';
import { buildReceiptPdf } from './pdf/builders/receipt-pdf.builder';

export interface GeneratedDocument {
    buffer: Buffer;
    filename: string;
    contentType: string;
}

@Injectable()
export class DocumentsService {
    constructor(
        private readonly prisma: DatabaseService,
        private readonly invoicesService: InvoicesService,
        private readonly receiptsService: ReceiptsService,
        private readonly pdfService: PdfService,
        private readonly emailService: EmailService,
    ) {}

    /* ============================ INVOICE ============================ */

    async generateInvoicePdf(
        managerId: string,
        invoiceId: string,
    ): Promise<GeneratedDocument> {
        const invoice = (await this.invoicesService.getForDelivery(
            managerId,
            invoiceId,
        )) as any;

        const manager = await this.getManager(managerId);

        // Fetch the tenancy for the property unit (not returned by getForDelivery)
        const tenancy = await this.prisma.db.orm.public.Tenancy.where({
            id: invoice.tenancyId,
            managerId,
        }).first();

        const buffer = await this.pdfService.render((doc) =>
            buildInvoicePdf(doc, {
                manager: {
                    firstName: manager.firstName,
                    lastName: manager.lastName,
                    email: manager.email,
                    phone: manager.phone,
                    address: manager.address,
                },
                invoice: {
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    issueDate: invoice.issueDate,
                    dueDate: invoice.dueDate,
                    status: invoice.status,
                    subtotal: invoice.subtotal,
                    totalAmount: invoice.totalAmount,
                    amountPaid: invoice.amountPaid,
                    balanceDue: invoice.balanceDue,
                    notes: invoice.notes,
                },
                items: (invoice.items ?? []).map((i: any) => ({
                    description: i.description,
                    quantity: i.quantity,
                    unitAmount: i.unitAmount,
                    totalAmount: i.totalAmount,
                })),
                payments: (invoice.payments ?? []).map((p: any) => ({
                    paymentDate: p.paymentDate,
                    amount: p.amount,
                    paymentMethod: p.paymentMethod,
                    referenceNumber: p.referenceNumber,
                })),
                tenant: invoice.tenant,
                property: invoice.property,
                tenancy: {
                    propertyUnit: tenancy?.propertyUnit ?? '—',
                },
            }),
        );

        return {
            buffer,
            filename: `invoice-${invoice.invoiceNumber}.pdf`,
            contentType: 'application/pdf',
        };
    }

    async emailInvoicePdf(
        managerId: string,
        invoiceId: string,
        dto: SendDocumentDto,
    ) {
        const invoice = (await this.invoicesService.getForDelivery(
            managerId,
            invoiceId,
        )) as any;

        const manager = await this.getManager(managerId);
        const doc = await this.generateInvoicePdf(managerId, invoiceId);

        const recipient = dto.to ?? invoice.tenant?.email ?? null;
        if (!recipient) {
            throw new BadRequestException(
                'No recipient email address is available. Provide one in the request body or update the tenant record.',
            );
        }

        await this.emailService.sendWithAttachment({
            to: recipient,
            subject:
                dto.subject ??
                `Invoice ${invoice.invoiceNumber} from ${manager.firstName} ${manager.lastName}`,
            text:
                dto.message ??
                `Dear ${invoice.tenant?.firstName ?? 'Tenant'}, please find attached invoice ${invoice.invoiceNumber}.`,
            attachment: {
                filename: doc.filename,
                content: doc.buffer,
                contentType: doc.contentType,
            },
        });

        return {
            message: 'Invoice emailed successfully',
            to: recipient,
            filename: doc.filename,
        };
    }

    /* ============================ RECEIPT ============================ */

    async generateReceiptPdf(
        managerId: string,
        receiptId: string,
    ): Promise<GeneratedDocument> {
        const receipt = (await this.receiptsService.getForDocument(
            managerId,
            receiptId,
        )) as any;

        const manager = await this.getManager(managerId);

        // Invoice (the primary one the payment was made against)
        const invoice = receipt.invoice;

        // Tenancy — for the property unit
        let propertyUnit = '—';
        if (invoice?.tenancyId) {
            const tenancy = await this.prisma.db.orm.public.Tenancy.where({
                id: invoice.tenancyId,
                managerId,
            }).first();
            propertyUnit = tenancy?.propertyUnit ?? '—';
        }

        // Enrich allocations with their invoice numbers
        const rawAllocations: any[] = receipt.allocations ?? [];
        const allocations = await Promise.all(
            rawAllocations.map(async (alloc) => {
                const allocInvoice = await this.prisma.db.orm.public.Invoice
                    .where({
                        id: alloc.invoiceId,
                        managerId,
                    })
                    .first();

                return {
                    id: alloc.id,
                    invoiceId: alloc.invoiceId,
                    invoiceNumber: allocInvoice?.invoiceNumber ?? '—',
                    amount: alloc.amount,
                    paymentReference:
                        receipt.payment?.referenceNumber ?? receipt.payment?.id,
                };
            }),
        );

        const buffer = await this.pdfService.render((doc) =>
            buildReceiptPdf(doc, {
                manager: {
                    firstName: manager.firstName,
                    lastName: manager.lastName,
                    email: manager.email,
                    phone: manager.phone,
                    address: manager.address,
                },
                receipt: {
                    id: receipt.id,
                    receiptNumber: receipt.receiptNumber,
                    issuedAt: receipt.issuedAt,
                    notes: receipt.notes,
                },
                payment: {
                    id: receipt.payment.id,
                    paymentDate: receipt.payment.paymentDate,
                    amount: receipt.payment.amount,
                    paymentMethod: receipt.payment.paymentMethod,
                    referenceNumber: receipt.payment.referenceNumber,
                    status: receipt.payment.status,
                    notes: receipt.payment.notes,
                },
                invoice: {
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                },
                allocations,
                tenant: receipt.tenant,
                property: receipt.property,
                tenancy: { propertyUnit },
            }),
        );

        return {
            buffer,
            filename: `receipt-${receipt.receiptNumber}.pdf`,
            contentType: 'application/pdf',
        };
    }

    async emailReceiptPdf(
        managerId: string,
        receiptId: string,
        dto: SendDocumentDto,
    ) {
        const receipt = (await this.receiptsService.getForDocument(
            managerId,
            receiptId,
        )) as any;

        const manager = await this.getManager(managerId);
        const doc = await this.generateReceiptPdf(managerId, receiptId);

        const recipient = dto.to ?? receipt.tenant?.email ?? null;
        if (!recipient) {
            throw new BadRequestException(
                'No recipient email address is available. Provide one in the request body or update the tenant record.',
            );
        }

        await this.emailService.sendWithAttachment({
            to: recipient,
            subject:
                dto.subject ??
                `Receipt ${receipt.receiptNumber} from ${manager.firstName} ${manager.lastName}`,
            text:
                dto.message ??
                `Dear ${receipt.tenant?.firstName ?? 'Tenant'}, please find attached your receipt ${receipt.receiptNumber}.`,
            attachment: {
                filename: doc.filename,
                content: doc.buffer,
                contentType: doc.contentType,
            },
        });

        return {
            message: 'Receipt emailed successfully',
            to: recipient,
            filename: doc.filename,
        };
    }

    /* ============================ HELPERS ============================ */

    private async getManager(managerId: string) {
        const manager = await this.prisma.db.orm.public.User.where({
            id: managerId,
        }).first();

        if (!manager) {
            throw new NotFoundException('Manager not found');
        }

        return manager;
    }
}