export function generateReceiptNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const random = Math.floor(100000 + Math.random() * 900000);

  return `RCT-${date}-${random}`;
}
