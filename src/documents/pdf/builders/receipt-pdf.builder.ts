import PDFDocument from 'pdfkit';
import {
    formatAmount,
    formatCurrency,
    formatDateTime,
    formatPaymentStatus,
    managerFullName,
    paymentStatusColor,
    tenantFullName,
} from '../utils/format';

const COLORS = {
    primary: '#111827',
    muted: '#6b7280',
    line: '#e5e7eb',
    bg: '#f9fafb',
    white: '#ffffff',
    accent: '#059669',
};

export interface ReceiptPdfData {
    manager: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        address: string;
    };
    receipt: {
        id: string;
        receiptNumber: string;
        issuedAt: Date | string;
        notes?: string | null;
    };
    payment: {
        id: string;
        paymentDate: Date | string;
        amount: string;
        paymentMethod: string;
        referenceNumber?: string | null;
        status: string;
        notes?: string | null;
    };
    invoice: {
        id: string;
        invoiceNumber: string;
    };
    allocations: Array<{
        id: string;
        invoiceId: string;
        invoiceNumber: string;
        amount: string;
        paymentReference?: string | null;
    }>;
    tenant: {
        firstName: string;
        lastName: string;
        email?: string | null;
        phone?: string | null;
        address?: string | null;
    };
    property: {
        name: string;
        addressLine1: string;
        addressLine2?: string | null;
        city: string;
        state?: string | null;
        postalCode?: string | null;
        country: string;
        currency?: string;
    };
    tenancy: {
        propertyUnit: string;
    };
}

export function buildReceiptPdf(
    doc: PDFKit.PDFDocument,
    data: ReceiptPdfData,
): void {
    const currency = data.property.currency ?? 'KES';
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const contentWidth = right - left;

    const managerName = managerFullName(data.manager);
    const tenantName = tenantFullName(data.tenant);
    const statusLabel = formatPaymentStatus(data.payment.status);
    const statusColor = paymentStatusColor(data.payment.status);

    let y = doc.page.margins.top;

    /* ============================================================
     * 1. HEADER — issuer block (name + address + phone | email)
     * ============================================================ */

    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.primary);
    doc.text(managerName, left, y);

    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted);
    doc.text(data.manager.address, left, y + 18, {
        width: contentWidth,
    });
    doc.text(
        `Phone: ${data.manager.phone}  |  Email: ${data.manager.email}`,
        left,
        y + 30,
        { width: contentWidth },
    );

    y += 52;

    doc
        .strokeColor(COLORS.line)
        .lineWidth(0.7)
        .moveTo(left, y)
        .lineTo(right, y)
        .stroke();

    y += 20;

    /* ============================================================
     * 2. STATUS BANNER — "PAYMENT SUCCESSFUL" (coloured by status)
     * ============================================================ */

    doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(statusColor)
        .text(statusLabel.toUpperCase(), left, y, {
            width: contentWidth,
            align: 'center',
        });

    y += 26;

    /* ============================================================
     * 3. RECEIPT NUMBER
     * ============================================================ */

    doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(COLORS.primary)
        .text(data.receipt.receiptNumber, left, y);

    y += 24;

    doc
        .strokeColor(COLORS.line)
        .lineWidth(0.5)
        .moveTo(left, y)
        .lineTo(right, y)
        .stroke();

    y += 16;

    /* ============================================================
     * 4. RECEIVED FROM (PAYER)
     * ============================================================ */

    doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text('RECEIVED FROM (PAYER)', left, y);

    y += 16;

    doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(COLORS.primary)
        .text(tenantName, left, y);

    y += 18;

    const propertyAddress = [
        data.property.addressLine1,
        data.property.addressLine2,
        data.property.city,
        data.property.state,
        data.property.postalCode,
    ]
        .filter(Boolean)
        .join(', ');

    doc.font('Helvetica').fontSize(9).fillColor(COLORS.primary);
    doc.text(
        `Unit / Property: ${data.tenancy.propertyUnit}`,
        left,
        y,
    );
    doc.text(`Address: ${propertyAddress}`, left, y + 14, {
        width: contentWidth,
    });

    y += 42;

    /* ============================================================
     * 5. RECEIPT DETAILS
     * ============================================================ */

    doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text('RECEIPT DETAILS', left, y);

    y += 16;

    const detailRows: Array<[string, string]> = [
        ['Issued Date', formatDateTime(data.receipt.issuedAt)],
        ['Payment Method', data.payment.paymentMethod],
        ['Payment ID', data.payment.id],
    ];

    const detailColWidth = contentWidth / 3;
    detailRows.forEach((row, idx) => {
        const x = left + idx * detailColWidth;

        doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted);
        doc.text(`${row[0]}:`, x, y, { width: detailColWidth });

        doc.font('Helvetica-Bold').fillColor(COLORS.primary);
        doc.text(row[1], x, y + 12, {
            width: detailColWidth - 6,
        });
    });

    y += 38;

    /* ============================================================
     * 6. TOTAL AMOUNT RECEIVED
     * ============================================================ */

    doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text('TOTAL AMOUNT RECEIVED', left, y);

    y += 16;

    doc
        .font('Helvetica-Bold')
        .fontSize(28)
        .fillColor(COLORS.accent)
        .text(
            `${currency} ${formatAmount(data.payment.amount)}`,
            left,
            y,
        );

    y += 46;

    /* ============================================================
     * 7. ALLOCATIONS TABLE
     *    Columns: APPLIED TO DOCUMENT | PAYMENT REFERENCE | ALLOCATED AMOUNT
     * ============================================================ */

    const colDocX = left + 8;
    const colDocW = contentWidth - 300;
    const colRefX = left + contentWidth - 290;
    const colRefW = 140;
    const colAmtX = left + contentWidth - 140;
    const colAmtW = 132;

    doc.rect(left, y, contentWidth, 24).fill(COLORS.primary);
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
    doc.text('APPLIED TO DOCUMENT', colDocX, y + 8, {
        width: colDocW,
    });
    doc.text('PAYMENT REFERENCE', colRefX, y + 8, {
        width: colRefW,
    });
    doc.text('ALLOCATED AMOUNT', colAmtX, y + 8, {
        width: colAmtW,
        align: 'right',
    });

    y += 24;
    const tableTop = y;

    const rows = data.allocations.length
        ? data.allocations
        : [
            {
                id: 'primary',
                invoiceId: data.invoice.id,
                invoiceNumber: data.invoice.invoiceNumber,
                amount: data.payment.amount,
                paymentReference:
                    data.payment.referenceNumber ?? data.payment.id,
            },
        ];

    for (const alloc of rows) {
        const docLabel = `Invoice ${alloc.invoiceNumber}  (Ref: ${alloc.invoiceId})`;
        const refLabel =
            alloc.paymentReference ?? data.payment.referenceNumber ?? data.payment.id;
        const amountLabel = formatCurrency(alloc.amount, currency);

        doc.font('Helvetica').fontSize(9).fillColor(COLORS.primary);

        const descHeight = doc.heightOfString(docLabel, {
            width: colDocW,
        });
        const rowH = Math.max(22, descHeight + 10);

        doc.text(docLabel, colDocX, y + 7, { width: colDocW });
        doc.text(refLabel, colRefX, y + 7, { width: colRefW });
        doc.text(amountLabel, colAmtX, y + 7, {
            width: colAmtW,
            align: 'right',
        });

        y += rowH;
        doc
            .strokeColor(COLORS.line)
            .lineWidth(0.5)
            .moveTo(left, y)
            .lineTo(right, y)
            .stroke();
    }

    doc
        .strokeColor(COLORS.line)
        .lineWidth(0.7)
        .rect(left, tableTop - 24, contentWidth, y - (tableTop - 24))
        .stroke();

    y += 26;

    /* ============================================================
     * 8. OFFICIAL RECEIPT ACKNOWLEDGMENT
     * ============================================================ */

    doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(COLORS.primary)
        .text('Official Receipt Acknowledgment', left, y);

    y += 15;

    const acknowledgment =
        `This document serves as an official proof of payment for invoice ` +
        `${data.invoice.invoiceNumber} in the amount of ` +
        `${currency} ${formatAmount(data.payment.amount)} processed via ` +
        `${data.payment.paymentMethod}.`;

    doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text(acknowledgment, left, y, { width: contentWidth });

    y = doc.y + 24;

    /* ============================================================
     * 9. SIGNATURE BLOCK
     * ============================================================ */

    doc
        .strokeColor(COLORS.line)
        .lineWidth(0.7)
        .moveTo(left, y)
        .lineTo(left + 240, y)
        .stroke();

    doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text('Authorized Signature', left, y + 4);

    doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(COLORS.primary)
        .text(managerName, left + 260, y + 4);

    doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(COLORS.muted)
        .text('Property Manager', left + 260, y + 18);

    /* ============================================================
     * 10. FOOTER
     * ============================================================ */

    doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(
            `Generated on ${formatDateTime(new Date()).split(',')[0]}  ·  ${managerName}`,
            left,
            doc.page.height - doc.page.margins.bottom - 12,
            { width: contentWidth, align: 'center' },
        );
}