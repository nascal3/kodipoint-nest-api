import PDFDocument from 'pdfkit';
import {
    formatCurrency,
    formatDate,
    formatInvoiceStatus, invoiceStatusColor,
    managerFullName,
    tenantFullName,
} from '../utils/format';

const COLORS = {
    primary: '#111827',
    muted: '#6b7280',
    line: '#e5e7eb',
    bg: '#f9fafb',
    white: '#ffffff',
    accent: '#2563eb',
};

export interface InvoicePdfData {
    manager: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        address: string;
    };
    invoice: {
        id: string;
        invoiceNumber: string;
        issueDate: Date | string;
        dueDate: Date | string;
        status: string;
        subtotal: string;
        totalAmount: string;
        amountPaid: string;
        balanceDue: string;
        notes?: string | null;
    };
    items: Array<{
        description: string;
        quantity: string;
        unitAmount: string;
        totalAmount: string;
    }>;
    payments: Array<{
        paymentDate: Date | string;
        amount: string;
        paymentMethod: string;
        referenceNumber?: string | null;
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

export function buildInvoicePdf(
    doc: PDFKit.PDFDocument,
    data: InvoicePdfData,
): void {
    const currency = data.property.currency ?? 'KES';
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const contentWidth = right - left;

    const managerName = managerFullName(data.manager);
    const tenantName = tenantFullName(data.tenant);

    let y = doc.page.margins.top;

    /* ============================================================
     * 1. HEADER
     *    Left  : invoice number
     *    Right : issuer (manager) name + address + phone | email
     * ============================================================ */

    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.primary);
    doc.text(data.invoice.invoiceNumber, left, y);

    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary);
    doc.text(managerName, left, y, {
        width: contentWidth,
        align: 'right',
    });

    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted);
    doc.text(data.manager.address, left, y + 16, {
        width: contentWidth,
        align: 'right',
    });
    doc.text(
        `Phone: ${data.manager.phone}  |  Email: ${data.manager.email}`,
        left,
        y + 28,
        { width: contentWidth, align: 'right' },
    );

    y += 52;

    doc
        .strokeColor(COLORS.line)
        .lineWidth(0.7)
        .moveTo(left, y)
        .lineTo(right, y)
        .stroke();

    y += 18;

    /* ============================================================
     * 2. ISSUED TO (TENANT)
     * ============================================================ */

    doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text('ISSUED TO (TENANT)', left, y);

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
        `Unit / Property Details: ${data.tenancy.propertyUnit}`,
        left,
        y,
    );
    doc.text(`Address: ${propertyAddress}`, left, y + 14, {
        width: contentWidth,
    });

    y += 42;

    /* ============================================================
     * 3. INVOICE DETAILS
     * ============================================================ */

    doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text('INVOICE DETAILS', left, y);

    y += 16;

    const detailRows: Array<[string, string]> = [
        ['Invoice Date', formatDate(data.invoice.issueDate)],
        ['Due Date', formatDate(data.invoice.dueDate)],
        ['Reference ID', data.invoice.id],
        ['Status', formatInvoiceStatus(data.invoice.status)],
    ];

    const detailColWidth = contentWidth / 2;
    detailRows.forEach((row, idx) => {
        const col = idx % 2;
        const rowIdx = Math.floor(idx / 2);
        const x = left + col * detailColWidth;
        const rowY = y + rowIdx * 16;

        doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted);
        doc.text(`${row[0]}:`, x, rowY, { width: 90 });

        const isStatus = row[0] === 'Status';
        doc
            .font('Helvetica-Bold')
            .fillColor(
                isStatus
                    ? invoiceStatusColor(data.invoice.status)
                    : COLORS.primary,
            );

        doc.text(row[1], x + 90, rowY, {
            width: detailColWidth - 96,
        });
    });

    y += 40;

    /* ============================================================
     * 4. ITEMS TABLE
     * ============================================================ */

    const colDescX = left + 8;
    const colDescW = contentWidth - 260;
    const colQtyX = left + contentWidth - 240;
    const colQtyW = 50;
    const colUnitX = left + contentWidth - 185;
    const colUnitW = 85;
    const colTotalX = left + contentWidth - 95;
    const colTotalW = 87;

    doc.rect(left, y, contentWidth, 24).fill(COLORS.primary);
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
    doc.text('DESCRIPTION', colDescX, y + 8, { width: colDescW });
    doc.text('QTY', colQtyX, y + 8, {
        width: colQtyW,
        align: 'right',
    });
    doc.text('UNIT PRICE', colUnitX, y + 8, {
        width: colUnitW,
        align: 'right',
    });
    doc.text('TOTAL AMOUNT', colTotalX, y + 8, {
        width: colTotalW,
        align: 'right',
    });

    y += 24;
    const tableTop = y;

    for (const item of data.items) {
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.primary);
        const descHeight = doc.heightOfString(item.description, {
            width: colDescW,
        });
        const rowH = Math.max(20, descHeight + 8);

        doc.text(item.description, colDescX, y + 6, {
            width: colDescW,
        });
        doc.text(String(item.quantity), colQtyX, y + 6, {
            width: colQtyW,
            align: 'right',
        });
        doc.text(
            formatCurrency(item.unitAmount, currency),
            colUnitX,
            y + 6,
            { width: colUnitW, align: 'right' },
        );
        doc.text(
            formatCurrency(item.totalAmount, currency),
            colTotalX,
            y + 6,
            { width: colTotalW, align: 'right' },
        );

        y += rowH;
        doc
            .strokeColor(COLORS.line)
            .lineWidth(0.5)
            .moveTo(left, y)
            .lineTo(right, y)
            .stroke();
    }

    // Outline around the entire items table
    doc
        .strokeColor(COLORS.line)
        .lineWidth(0.7)
        .rect(left, tableTop - 24, contentWidth, y - (tableTop - 24))
        .stroke();

    y += 22;

    /* ============================================================
     * 5. PAYMENT INSTRUCTIONS & NOTES
     * ============================================================ */

    doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(COLORS.primary)
        .text('Payment Instructions & Notes', left, y);

    y += 15;

    const instructions =
        data.invoice.notes ??
        'Please make payments directly to the designated property management account.';

    doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text(instructions, left, y, { width: contentWidth });

    y = doc.y + 4;

    doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text(`- Reference: ${data.invoice.invoiceNumber}`, left, y, {
            width: contentWidth,
        });

    y = doc.y + 18;

    /* ============================================================
     * 6. SUMMARY PANEL (right-aligned)
     * ============================================================ */

    const rentItem = data.items.find(
        (i) => i.description.toLowerCase() === 'monthly rent',
    );
    const bfItem = data.items.find(
        (i) =>
            i.description.toLowerCase() === 'balance brought forward',
    );
    const serviceItems = data.items.filter(
        (i) => i !== rentItem && i !== bfItem,
    );

    const rentTotal = rentItem ? rentItem.totalAmount : '0.00';
    const bfTotal = bfItem ? bfItem.totalAmount : '0.00';
    const serviceTotal = serviceItems
        .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0)
        .toFixed(2);

    const summaryX = right - 260;
    const summaryW = 260;
    const rowH = 15;

    const summaryRows: Array<{
        label: string;
        value: string;
        bold?: boolean;
        divider?: boolean;
    }> = [
        { label: 'Rent', value: formatCurrency(rentTotal, currency) },
        {
            label: 'Service Charges',
            value: formatCurrency(serviceTotal, currency),
        },
        {
            label: 'Balance Brought Forward',
            value: formatCurrency(bfTotal, currency),
        },
        {
            label: 'Subtotal',
            value: formatCurrency(data.invoice.subtotal, currency),
        },
        {
            label: 'Total Amount',
            value: formatCurrency(data.invoice.totalAmount, currency),
        },
        {
            label: 'Amount Paid',
            value: formatCurrency(data.invoice.amountPaid, currency),
        },
        { divider: true, label: '', value: '' },
        {
            label: 'Balance Due',
            value: formatCurrency(data.invoice.balanceDue, currency),
            bold: true,
        },
    ];

    const summaryHeight = summaryRows.length * rowH + 16;

    doc
        .roundedRect(summaryX, y, summaryW, summaryHeight, 4)
        .fillAndStroke(COLORS.bg, COLORS.line);

    let sy = y + 8;
    for (const row of summaryRows) {
        if (row.divider) {
            doc
                .strokeColor(COLORS.line)
                .lineWidth(0.5)
                .moveTo(summaryX + 10, sy + 2)
                .lineTo(summaryX + summaryW - 10, sy + 2)
                .stroke();
            sy += rowH;
            continue;
        }

        doc
            .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(row.bold ? 10 : 9)
            .fillColor(row.bold ? COLORS.primary : COLORS.muted);

        doc.text(row.label, summaryX + 12, sy, {
            width: summaryW - 130,
        });
        doc.fillColor(COLORS.primary).text(row.value, summaryX + 130, sy, {
            width: summaryW - 142,
            align: 'right',
        });

        sy += rowH;
    }

    y += summaryHeight + 24;

    /* ============================================================
     * 7. PAYMENTS RECEIVED (optional)
     * ============================================================ */

    if (data.payments.length > 0) {
        doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor(COLORS.primary)
            .text('Payments Received', left, y);
        y += 16;

        doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted);
        for (const p of data.payments) {
            const line = [
                formatDate(p.paymentDate),
                p.paymentMethod,
                formatCurrency(p.amount, currency),
                p.referenceNumber ?? '',
            ]
                .filter(Boolean)
                .join('  ·  ');
            doc.text(line, left, y, { width: contentWidth });
            y += 13;
        }

        y += 10;
    }

    /* ============================================================
     * 8. FOOTER
     * ============================================================ */

    doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(
            `Generated on ${formatDate(new Date())}  ·  ${managerName}`,
            left,
            doc.page.height - doc.page.margins.bottom - 12,
            { width: contentWidth, align: 'center' },
        );
}