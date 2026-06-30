import type { Master } from '@/types/electron';

export function filterMasters(masters: Master[], query: string): Master[] {
  const q = query.trim().toLowerCase();
  if (!q) return masters;

  return masters.filter((m) => {
    const desc = m.memo ?? '';
    return (
      m.masterNo.toLowerCase().includes(q) ||
      desc.toLowerCase().includes(q) ||
      m.masterValue.toLowerCase().includes(q)
    );
  });
}

export function masterDisplayName(master: Master): string {
  return master.memo?.trim() || `Master ${master.masterNo}`;
}
