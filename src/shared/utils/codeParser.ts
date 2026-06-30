/**
 * Code 데이터 CSV/TXT 파싱
 */

export interface ParsedCodeRow {
  code: string;
  type: string;
  description: string;
  lineNumber: number;
}

export interface CodeParseResult {
  rows: ParsedCodeRow[];
  errors: string[];
  format: 'txt' | 'csv' | 'xlsx';
  skippedLines: number;
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

function normalizeCode(raw: string): string | null {
  const trimmed = raw.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return null;
  return trimmed;
}

function parseRowParts(
  parts: string[],
  lineNumber: number,
  errors: string[],
): ParsedCodeRow | null {
  const code = normalizeCode(parts[0] ?? '');
  if (!code) {
    errors.push(`${lineNumber}행: 코드명 오류`);
    return null;
  }

  const type = (parts[1] ?? '').replace(/^["']|["']$/g, '').trim();
  const description = (parts[2] ?? '').replace(/^["']|["']$/g, '').trim();

  if (!type) {
    errors.push(`${lineNumber}행: 코드 ${code} — type 누락`);
    return null;
  }

  return { code, type, description, lineNumber };
}

export function parseCodeTxtContent(content: string): CodeParseResult {
  const errors: string[] = [];
  const rows: ParsedCodeRow[] = [];
  let skippedLines = 0;

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] ?? '').trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      skippedLines += 1;
      continue;
    }

    let parts = parseDelimitedLine(line);
    if (parts.length < 2) {
      parts = line.split(/\s+/).map((p) => p.trim());
    }

    const row = parseRowParts(parts, i + 1, errors);
    if (row) rows.push(row);
  }

  return { rows, errors, format: 'txt', skippedLines };
}

export function parseCodeCsvContent(content: string): CodeParseResult {
  const errors: string[] = [];
  const rows: ParsedCodeRow[] = [];
  const skippedLines = 0;

  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { rows, errors: ['파일이 비어 있습니다.'], format: 'csv', skippedLines: 0 };
  }

  const headerCols = parseDelimitedLine(lines[0] ?? '').map((h) =>
    h.toLowerCase().replace(/\s+/g, '').replace(/_/g, ''),
  );

  const codeIdx = headerCols.findIndex((h) => ['code', 'codename', '코드', '코드명'].includes(h));
  const typeIdx = headerCols.findIndex((h) => ['type', 'codetype', '유형', '타입'].includes(h));
  const descIdx = headerCols.findIndex((h) =>
    ['description', 'desc', '설명', 'memo', 'note'].includes(h),
  );

  const hasHeader = codeIdx >= 0 && typeIdx >= 0;
  const startRow = hasHeader ? 1 : 0;
  const cIdx = codeIdx >= 0 ? codeIdx : 0;
  const tIdx = typeIdx >= 0 ? typeIdx : 1;
  const dIdx = descIdx >= 0 ? descIdx : 2;

  for (let i = startRow; i < lines.length; i += 1) {
    const cols = parseDelimitedLine(lines[i] ?? '');
    const row = parseRowParts([cols[cIdx], cols[tIdx], cols[dIdx]], i + 1, errors);
    if (row) rows.push(row);
  }

  return { rows, errors, format: 'csv', skippedLines };
}

export function parseCodeDataFile(fileName: string, content: string): CodeParseResult {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv')) return parseCodeCsvContent(content);
  if (lower.endsWith('.txt')) return parseCodeTxtContent(content);

  const firstLine = content.split(/\r?\n/)[0]?.toLowerCase() ?? '';
  if (firstLine.includes('code') && firstLine.includes('type')) {
    return parseCodeCsvContent(content);
  }
  return parseCodeTxtContent(content);
}

export function dedupeCodeRows(rows: ParsedCodeRow[]): ParsedCodeRow[] {
  const map = new Map<string, ParsedCodeRow>();
  for (const row of rows) {
    map.set(row.code, row);
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}
