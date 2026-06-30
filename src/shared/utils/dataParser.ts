/**
 * 마스터 데이터 일괄 가져오기 — TXT/CSV 파싱 및 정제
 */

export interface ParsedMasterRow {
  masterNo: string;
  masterValue: string;
  memo: string | null;
  lineNumber: number;
}

export interface ParseResult {
  rows: ParsedMasterRow[];
  errors: string[];
  format: 'txt' | 'csv' | 'xlsx';
  skippedLines: number;
}

/** 숫자 이외 문자 제거 — 공백, 특수문자, 알파벳 등 */
export function cleanDigitSequence(raw: string): string {
  if (!raw) return '';
  return raw.replace(/[\s,\r\n\t;|]+/g, '').replace(/\D/g, '');
}

export function normalizeMasterNo(raw: string): string | null {
  const trimmed = raw.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return null;
  const num = parseInt(trimmed, 10);
  if (Number.isNaN(num) || num < 0 || num > 99) return null;
  return String(num).padStart(2, '0');
}

function parseDelimitedLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i] ?? '';
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if ((ch === ',' || ch === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

/** TXT: `마스터번호,숫자배열,비고` 또는 공백/탭 구분 */
export function parseTxtContent(content: string): ParseResult {
  const errors: string[] = [];
  const rows: ParsedMasterRow[] = [];
  let skippedLines = 0;

  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i] ?? '';
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      skippedLines += 1;
      continue;
    }

    let parts = parseDelimitedLine(line);
    if (parts.length < 2) {
      parts = line.split(/\s+/).map((p) => p.trim());
    }

    const masterNo = normalizeMasterNo(parts[0] ?? '');
    if (!masterNo) {
      errors.push(`${i + 1}행: 마스터 번호 오류 (${parts[0] ?? '(빈값)'})`);
      continue;
    }

    const valueRaw = parts[1] ?? '';
    const memo =
      parts.length >= 3
        ? parts
            .slice(2)
            .join(',')
            .replace(/^["']|["']$/g, '')
            .trim() || null
        : null;
    const masterValue = cleanDigitSequence(valueRaw);

    if (!masterValue) {
      errors.push(`${i + 1}행: 마스터 ${masterNo} — 숫자 시퀀스 없음`);
      continue;
    }

    rows.push({ masterNo, masterValue, memo, lineNumber: i + 1 });
  }

  return { rows, errors, format: 'txt', skippedLines };
}

/** CSV: masterNo, value, memo 컬럼 매핑 */
export function parseCsvContent(content: string): ParseResult {
  const errors: string[] = [];
  const rows: ParsedMasterRow[] = [];
  let skippedLines = 0;

  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { rows, errors: ['파일이 비어 있습니다.'], format: 'csv', skippedLines: 0 };
  }

  const headerCols = parseDelimitedLine(lines[0] ?? '').map((h) =>
    h.toLowerCase().replace(/\s+/g, '').replace(/_/g, ''),
  );

  const masterNoIdx = headerCols.findIndex((h) =>
    ['masterno', 'no', '마스터번호', '번호', 'master'].includes(h),
  );
  const valueIdx = headerCols.findIndex((h) =>
    ['value', 'mastervalue', '숫자', '숫자배열', 'data', 'digits'].includes(h),
  );
  const memoIdx = headerCols.findIndex((h) => ['memo', '비고', 'note', 'remark'].includes(h));

  const hasHeader = masterNoIdx >= 0 && valueIdx >= 0;
  const startRow = hasHeader ? 1 : 0;
  const mIdx = masterNoIdx >= 0 ? masterNoIdx : 0;
  const vIdx = valueIdx >= 0 ? valueIdx : 1;
  const memIdx = memoIdx >= 0 ? memoIdx : 2;

  if (!hasHeader && lines.length > 0) {
    skippedLines = 0;
  }

  for (let i = startRow; i < lines.length; i += 1) {
    const cols = parseDelimitedLine(lines[i] ?? '');
    const masterNo = normalizeMasterNo(cols[mIdx] ?? '');
    if (!masterNo) {
      errors.push(`${i + 1}행: 마스터 번호 오류`);
      continue;
    }

    const masterValue = cleanDigitSequence(cols[vIdx] ?? '');
    if (!masterValue) {
      errors.push(`${i + 1}행: 마스터 ${masterNo} — 숫자 시퀀스 없음`);
      continue;
    }

    const memo = cols[memIdx]?.replace(/^["']|["']$/g, '').trim() || null;
    rows.push({ masterNo, masterValue, memo, lineNumber: i + 1 });
  }

  return { rows, errors, format: 'csv', skippedLines };
}

export function parseMasterDataFile(fileName: string, content: string): ParseResult {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv')) return parseCsvContent(content);
  if (lower.endsWith('.txt')) return parseTxtContent(content);

  const firstLine = content.split(/\r?\n/)[0]?.toLowerCase() ?? '';
  if (firstLine.includes('masterno') || firstLine.includes('master_no')) {
    return parseCsvContent(content);
  }
  return parseTxtContent(content);
}

/** 동일 masterNo — 마지막 행 우선 */
export function dedupeMasterRows(rows: ParsedMasterRow[]): ParsedMasterRow[] {
  const map = new Map<string, ParsedMasterRow>();
  for (const row of rows) {
    map.set(row.masterNo, row);
  }
  return [...map.values()].sort((a, b) => a.masterNo.localeCompare(b.masterNo));
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('파일 읽기 실패'));
    reader.readAsText(file, 'UTF-8');
  });
}
