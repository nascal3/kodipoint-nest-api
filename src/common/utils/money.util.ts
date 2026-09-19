import Decimal from 'decimal.js';

export function money(value: unknown): Decimal {
    return new Decimal(String(value ?? 0));
}

export function zeroMoney(): Decimal {
    return new Decimal(0);
}

export function isPositiveMoney(value: Decimal): boolean {
    return value.greaterThan(0);
}

export function isZeroMoney(value: Decimal): boolean {
    return value.equals(0);
}