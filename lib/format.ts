export function usd(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v > 0 && v < 0.01) return '<$0.01';
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function amt(n: number): string {
  if (n === 0) return '0';
  if (n < 0.0001) return n.toExponential(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function shorten(addr?: string): string {
  if (!addr) return '';
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}
