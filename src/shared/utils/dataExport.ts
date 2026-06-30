import type { Code, Master } from '@/types/electron';

function csvCell(value: string | number | boolean | null | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function mastersToCsv(masters: Master[]): string {
  const header = 'masterNo,value,memo';
  const lines = [...masters]
    .sort((a, b) => a.masterNo.localeCompare(b.masterNo))
    .map((row) => [row.masterNo, row.masterValue, row.memo ?? ''].map(csvCell).join(','));
  return [header, ...lines].join('\n');
}

export function codesToCsv(codes: Code[]): string {
  const header = 'code,type,description';
  const lines = [...codes]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((row) => [row.code, row.type, row.description].map(csvCell).join(','));
  return [header, ...lines].join('\n');
}
