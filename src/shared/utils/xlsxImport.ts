import type { Master, Code } from '@/types/electron';
import type { ParsedMasterRow, ParseResult } from './dataParser';
import { cleanDigitSequence, normalizeMasterNo } from './dataParser';
import type { CodeParseResult, ParsedCodeRow } from './codeParser';

type XlsxModule = typeof import('xlsx');

let xlsxModulePromise: Promise<XlsxModule> | null = null;

async function loadXlsx(): Promise<XlsxModule> {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx').catch((error) => {
      xlsxModulePromise = null;
      throw error;
    });
  }
  return xlsxModulePromise;
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}

async function firstSheetRows(buffer: ArrayBuffer): Promise<string[][]> {
  const XLSX = await loadXlsx();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  return rows.map((row) => row.map((cell) => String(cell ?? '').trim()));
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase().replace(/\s+/g, '').replace(/_/g, ''));
  return normalized.findIndex((h) => candidates.includes(h));
}

export async function parseMasterXlsx(buffer: ArrayBuffer, fileName: string): Promise<ParseResult> {
  const errors: string[] = [];
  const rows: ParsedMasterRow[] = [];
  const table = await firstSheetRows(buffer);
  if (table.length === 0) {
    return { rows, errors: ['Excel 시트가 비어 있습니다.'], format: 'xlsx', skippedLines: 0 };
  }

  const header = table[0]?.map((cell) => String(cell)) ?? [];
  const masterIdx = findHeaderIndex(header, ['masterno', 'no', '마스터번호', '번호', 'master']);
  const valueIdx = findHeaderIndex(header, [
    'value',
    'mastervalue',
    '숫자',
    '숫자배열',
    'data',
    'digits',
  ]);
  const memoIdx = findHeaderIndex(header, ['memo', '비고', 'note', 'remark']);

  const hasHeader = masterIdx >= 0 && valueIdx >= 0;
  const startRow = hasHeader ? 1 : 0;
  const mIdx = masterIdx >= 0 ? masterIdx : 0;
  const vIdx = valueIdx >= 0 ? valueIdx : 1;
  const memIdx = memoIdx >= 0 ? memoIdx : 2;

  for (let i = startRow; i < table.length; i += 1) {
    const cols = table[i] ?? [];
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

    const memo = cols[memIdx]?.trim() || null;
    rows.push({ masterNo, masterValue, memo, lineNumber: i + 1 });
  }

  void fileName;
  return { rows, errors, format: 'xlsx', skippedLines: 0 };
}

export async function parseCodeXlsx(buffer: ArrayBuffer): Promise<CodeParseResult> {
  const errors: string[] = [];
  const rows: ParsedCodeRow[] = [];
  const table = await firstSheetRows(buffer);
  if (table.length === 0) {
    return { rows, errors: ['Excel 시트가 비어 있습니다.'], format: 'xlsx', skippedLines: 0 };
  }

  const header = table[0]?.map((cell) => String(cell)) ?? [];
  const codeIdx = findHeaderIndex(header, ['code', 'codename', '코드', '코드명']);
  const typeIdx = findHeaderIndex(header, ['type', 'codetype', '유형', '타입']);
  const descIdx = findHeaderIndex(header, ['description', 'desc', '설명', 'memo', 'note']);

  const hasHeader = codeIdx >= 0 && typeIdx >= 0;
  const startRow = hasHeader ? 1 : 0;
  const cIdx = codeIdx >= 0 ? codeIdx : 0;
  const tIdx = typeIdx >= 0 ? typeIdx : 1;
  const dIdx = descIdx >= 0 ? descIdx : 2;

  for (let i = startRow; i < table.length; i += 1) {
    const cols = table[i] ?? [];
    const code = (cols[cIdx] ?? '').trim();
    const type = (cols[tIdx] ?? '').trim();
    const description = (cols[dIdx] ?? '').trim();

    if (!code) {
      errors.push(`${i + 1}행: 코드명 오류`);
      continue;
    }
    if (!type) {
      errors.push(`${i + 1}행: 코드 ${code} — type 누락`);
      continue;
    }

    rows.push({ code, type, description, lineNumber: i + 1 });
  }

  return { rows, errors, format: 'xlsx', skippedLines: 0 };
}

export async function mastersToXlsxBase64(masters: Master[]): Promise<string> {
  const XLSX = await loadXlsx();
  const data = [
    ['masterNo', 'value', 'memo'],
    ...masters
      .sort((a, b) => a.masterNo.localeCompare(b.masterNo))
      .map((row) => [row.masterNo, row.masterValue, row.memo ?? '']),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Masters');
  return XLSX.write(book, { type: 'base64', bookType: 'xlsx' });
}

export async function codesToXlsxBase64(codes: Code[]): Promise<string> {
  const XLSX = await loadXlsx();
  const data = [
    ['code', 'type', 'description'],
    ...codes
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((row) => [row.code, row.type, row.description]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Codes');
  return XLSX.write(book, { type: 'base64', bookType: 'xlsx' });
}

export async function suiteResultsToXlsxBase64(
  rows: Array<{ name: string; field: string; expected: string; actual: string; passed: boolean }>,
): Promise<string> {
  const XLSX = await loadXlsx();
  const data = [
    ['name', 'field', 'expected', 'actual', 'passed'],
    ...rows.map((row) => [
      row.name,
      row.field,
      row.expected,
      row.actual,
      row.passed ? 'PASS' : 'FAIL',
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'TestSuite');
  return XLSX.write(book, { type: 'base64', bookType: 'xlsx' });
}
