const INVOICE_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Draft',
    ISSUED: 'Awaiting Payment',
    PARTIALLY_PAID: 'Partially Paid',
    PAID: 'Paid in Full',
    OVERDUE: 'Overdue',
    CANCELLED: 'Cancelled',
};

export function formatCurrency(amount: string | number | null | undefined, currency = 'KES',) {
    if (amount === null || amount === undefined) {
        return `${currency} 0.00`;
    }
    const value = typeof amount === 'number' ? amount : Number(amount);
    if (Number.isNaN(value)) {
        return `${currency} 0.00`;
    }
    return `${currency} ${value.toLocaleString('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/**
 * Plain number with 2 decimals and thousand separators, no currency code.
 * Used for the large "TOTAL AMOUNT RECEIVED" figure in the receipt.
 */
export function formatAmount(
    amount: string | number | null | undefined,
): string {
    if (amount === null || amount === undefined) return '0.00';
    const value = typeof amount === 'number' ? amount : Number(amount);
    if (Number.isNaN(value)) return '0.00';
    return value.toLocaleString('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function formatDate(value: Date | string | null | undefined) {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * e.g. "September 21, 2026, 12:00 UTC"
 */
export function formatDateTime(value: Date | string | null | undefined,): string {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    const day = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
    const time = date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
    });

    return `${day}, ${time} UTC`;
}

export function managerFullName(manager: { firstName: string; lastName: string; }) {
    return `${manager.firstName} ${manager.lastName}`.trim();
}

export function tenantFullName(tenant: { firstName: string; lastName: string; }) {
    return `${tenant.firstName} ${tenant.lastName}`.trim();
}

export function formatInvoiceStatus(status: string | null | undefined) {
    if (!status) return '—';

    const normalised = String(status).trim().toUpperCase();

    if (INVOICE_STATUS_LABELS[normalised]) {
        return INVOICE_STATUS_LABELS[normalised];
    }

    // Fallback: SNAKE_CASE → Title Case
    return normalised
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function invoiceStatusColor(status: string | null | undefined): string {
    const s = String(status ?? '').trim().toUpperCase();
    switch (s) {
        case 'PAID':
            return '#059669'; // green
        case 'OVERDUE':
            return '#dc2626'; // red
        case 'PARTIALLY_PAID':
            return '#d97706'; // amber
        case 'CANCELLED':
            return '#6b7280'; // grey
        case 'DRAFT':
            return '#6b7280'; // grey
        case 'ISSUED':
        default:
            return '#111827'; // default dark
    }
}

/* ============================================================
 * Payment status labels
 * ============================================================ */

const PAYMENT_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Payment Pending',
    PROCESSING: 'Payment Processing',
    SUCCESSFUL: 'Payment Successful',
    COMPLETED: 'Payment Successful',
    CONFIRMED: 'Payment Successful',
    FAILED: 'Payment Failed',
    DECLINED: 'Payment Declined',
    CANCELLED: 'Payment Cancelled',
    REFUNDED: 'Payment Refunded',
    REVERSED: 'Payment Reversed',
};

export function formatPaymentStatus(status: string | null | undefined,): string {
    if (!status) return '—';

    const normalised = String(status).trim().toUpperCase();
    if (PAYMENT_STATUS_LABELS[normalised]) {
        return PAYMENT_STATUS_LABELS[normalised];
    }

    return normalised
        .toLowerCase()
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export function paymentStatusColor(status: string | null | undefined,): string {
    const s = String(status ?? '').trim().toUpperCase();
    switch (s) {
        case 'SUCCESSFUL':
        case 'COMPLETED':
        case 'CONFIRMED':
            return '#059669';
        case 'FAILED':
        case 'DECLINED':
            return '#dc2626';
        case 'PENDING':
        case 'PROCESSING':
            return '#d97706';
        case 'CANCELLED':
        case 'REFUNDED':
        case 'REVERSED':
            return '#6b7280';
        default:
            return '#111827';
    }
}