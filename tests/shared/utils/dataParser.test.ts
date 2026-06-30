import { describe, expect, it } from 'vitest';
import {
  cleanDigitSequence,
  dedupeMasterRows,
  normalizeMasterNo,
  parseCsvContent,
  parseMasterDataFile,
  parseTxtContent,
} from '@/shared/utils/dataParser';

describe('cleanDigitSequence', () => {
  it('숫자만 남긴다', () => {
    expect(cleanDigitSequence('12 34,56\n78abc')).toBe('12345678');
  });
});

describe('normalizeMasterNo', () => {
  it('00~99 패딩', () => {
    expect(normalizeMasterNo('5')).toBe('05');
    expect(normalizeMasterNo('99')).toBe('99');
    expect(normalizeMasterNo('100')).toBeNull();
  });
});

describe('parseTxtContent', () => {
  it('쉼표 구분 행 파싱', () => {
    const result = parseTxtContent('00,1234567890,기본\n01,98765,테스트');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      masterNo: '00',
      masterValue: '1234567890',
      memo: '기본',
    });
  });

  it('특수문자 제거', () => {
    const result = parseTxtContent('02,1 2-3;4|5');
    expect(result.rows[0]?.masterValue).toBe('12345');
  });
});

describe('parseCsvContent', () => {
  it('헤더 매핑', () => {
    const csv = 'masterNo,value,memo\n00,111222,note1\n01,333,';
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1]?.masterValue).toBe('333');
  });
});

describe('dedupeMasterRows', () => {
  it('동일 masterNo는 마지막 행 우선', () => {
    const rows = dedupeMasterRows([
      { masterNo: '00', masterValue: '111', memo: null, lineNumber: 1 },
      { masterNo: '00', masterValue: '222', memo: null, lineNumber: 2 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.masterValue).toBe('222');
  });
});

describe('parseMasterDataFile', () => {
  it('확장자로 형식 선택', () => {
    const txt = parseMasterDataFile('data.txt', '00,123');
    expect(txt.format).toBe('txt');
    const csv = parseMasterDataFile('data.csv', 'masterNo,value\n00,123');
    expect(csv.format).toBe('csv');
  });
});
