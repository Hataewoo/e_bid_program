import { describe, expect, it } from 'vitest';
import { parseCodeCsvContent, dedupeCodeRows } from '@/shared/utils/codeParser';

describe('codeParser', () => {
  it('parses csv header rows', () => {
    const content = 'code,type,description\nA01,TYPE1,설명1\nA02,TYPE2,설명2';
    const result = parseCodeCsvContent(content);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.code).toBe('A01');
  });

  it('dedupes by code keeping last row', () => {
    const rows = dedupeCodeRows([
      { code: 'A01', type: 'T1', description: 'old', lineNumber: 1 },
      { code: 'A01', type: 'T2', description: 'new', lineNumber: 2 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.description).toBe('new');
  });
});
