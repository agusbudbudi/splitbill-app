export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    return 'Rp0';
  }

  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  });

  return formatter.format(Math.round(amount));
}

export function parseCurrency(value: string): number {
  const numeric = value.replace(/[^0-9.-]/g, '');
  return numeric ? Number(numeric) : 0;
}
