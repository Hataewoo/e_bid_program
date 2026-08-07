/**
 * 이명전기 STEP2/3 Code · 내용 — E-Myoung.exe 디컴파일 (frmMasterDetail + mod_function)
 */

export const LEGACY_CODE_CONTENT_ENGINE_VERSION = 'emyoung-decompiled-v2';

export {
  buildLegacyPatternValueGrid,
  buildLegacyPointBandContent,
  buildLegacyStep2BandBundle,
  buildLegacyStep3BandBundle,
  buildLegacyStepPanelBands,
  computeLegacyCodeContentGaps,
  formatDetailGridGaps,
  legacyRemarkSuffix,
  LEGACY_MASTER_COUNT_SPLITS,
  LEGACY_PATTERN_VALUE_GRID_LABELS,
  LEGACY_STEP2_POINT_BAND_SPLITS,
  LEGACY_STEP3_POINT_BAND_SPLITS,
  parseLegacyCommaArray,
  resolveLegacyCodeObjectBase,
  searchValueResultBetween,
  searchValueResultDetailGrid,
  searchValueResultDetailGridOverNumber,
  searchValueResultDuplicatArray,
  searchValueResultLH,
  searchValueResultStep2High,
  searchValueResultStep2Low,
  shouldComputeLegacyCodeContent,
} from './legacyEmyoungAlgorithms';

export type {
  LegacyPatternValueGridRow,
  LegacyPointBandContent,
  LegacyStep2BandBundle,
  LegacyStep3BandBundle,
  LegacyStepPanelBands,
} from './legacyEmyoungAlgorithms';

import type { AnalysisResult, CodeMatchInput, DigitClass } from './analysisEngine';
import { filterDigitsByClass, parseRunClassSequence } from './analysisEngine';
import {
  getLegacyStepCodeDefinition,
  getLegacyStepCodeOrder,
  LEGACY_STEP2_CODE_ORDER,
  LEGACY_STEP3_CODE_ORDER,
} from '../fixtures/legacy-step-code-catalog';
import type { DigitBand, DigitSubBand } from './digitSubBand';
import { getDigitSubBand, isDigitInSubBand } from './digitSubBand';
import { buildPointValueTokens } from './pointValuesCodeFlow';
import {
  computeLegacyCodeContentGaps,
  searchValueResultLH,
} from './legacyEmyoungAlgorithms';

export type LegacyCodeMatchKind = 'detailGrid';

export interface LegacyCodeObjectBase {
  objectDigits: string;
  baseDigits: string;
}

/** STEP2 Low — Master digit열 → 13코드 「내용」 */
export function buildLegacyStep2CodeContent(masterDigits: string): Record<string, string> {
  const lowDetail = searchValueResultLH('LOW', masterDigits, '5');
  const out: Record<string, string> = {};

  for (const code of LEGACY_STEP2_CODE_ORDER) {
    const def = getLegacyStepCodeDefinition(code, 'low');
    const remark = def?.description ?? '';
    const gaps = computeLegacyCodeContentGaps(lowDetail, code, remark);
    out[code] = gaps.join(',');
  }
  return out;
}

/** STEP3 High — Master digit열 → 13코드 「내용」 */
export function buildLegacyStep3CodeContent(masterDigits: string): Record<string, string> {
  const highDetail = searchValueResultLH('HIGH', masterDigits, '4');
  const out: Record<string, string> = {};

  for (const code of LEGACY_STEP3_CODE_ORDER) {
    const def = getLegacyStepCodeDefinition(code, 'high');
    const remark = def?.description ?? '';
    const gaps = computeLegacyCodeContentGaps(highDetail, code, remark);
    out[code] = gaps.join(',');
  }
  return out;
}

export interface LegacyCodeContentRow {
  code: string;
  type: string;
  matchKind: LegacyCodeMatchKind;
  matchCount: number;
  content: string;
  gaps: number[];
}

export function descriptionToSubBandSequence(
  description: string,
  mainBand: DigitBand,
): DigitSubBand[] | null {
  const classes = parseRunClassSequence(description);
  if (!classes || classes.length === 0) return null;

  return classes.map((cls) => {
    if (mainBand === 'low') {
      return cls === 'low' ? 'lowLow' : 'lowHigh';
    }
    return cls === 'low' ? 'highLow' : 'highHigh';
  });
}

export function buildDigitToTokenIndex(pointValues: string): number[] {
  const tokens = buildPointValueTokens(pointValues);
  const digitToToken: number[] = [];
  let digitIdx = 0;

  for (let ti = 0; ti < tokens.length; ti += 1) {
    const token = tokens[ti]!;
    const span = token.isRun ? token.value : 1;
    for (let j = 0; j < span; j += 1) {
      digitToToken[digitIdx] = ti;
      digitIdx += 1;
    }
  }

  return digitToToken;
}

/** S′ 토큰열에서 세부구간 시퀀스 매칭 (겹침 포함) — 역추적·진단용 */
export function findTokenSubBandSequenceStarts(
  pointValues: string,
  sequence: readonly DigitSubBand[],
): number[] {
  if (sequence.length === 0 || pointValues.length === 0) return [];

  const tokens = buildPointValueTokens(pointValues);
  if (tokens.length < sequence.length) return [];

  const bands = tokens.map((token) => getDigitSubBand(token.sourceDigit));
  const starts: number[] = [];

  for (let i = 0; i <= bands.length - sequence.length; i += 1) {
    let matched = true;
    for (let j = 0; j < sequence.length; j += 1) {
      if (bands[i + j] !== sequence[j]) {
        matched = false;
        break;
      }
    }
    if (matched) starts.push(i);
  }

  return starts;
}

export function findSubBandSequenceStarts(
  pointValues: string,
  sequence: readonly DigitSubBand[],
): number[] {
  if (sequence.length === 0 || pointValues.length < sequence.length) return [];

  const starts: number[] = [];
  for (let i = 0; i <= pointValues.length - sequence.length; i += 1) {
    let matched = true;
    for (let j = 0; j < sequence.length; j += 1) {
      const digit = Number(pointValues[i + j]);
      if (!Number.isInteger(digit) || !isDigitInSubBand(digit, sequence[j]!)) {
        matched = false;
        break;
      }
    }
    if (matched) starts.push(i);
  }

  return starts;
}

export function filterNonOverlappingMatchStarts(
  starts: readonly number[],
  patternLen: number,
): number[] {
  if (starts.length === 0 || patternLen <= 0) return [];

  const filtered: number[] = [starts[0]!];
  for (let i = 1; i < starts.length; i += 1) {
    const prev = filtered[filtered.length - 1]!;
    if (starts[i]! >= prev + patternLen) {
      filtered.push(starts[i]!);
    }
  }
  return filtered;
}

export function computeLegacyTokenGapSequence(
  pointValues: string,
  matchStarts: readonly number[],
  patternTokenLen: number,
): number[] {
  if (matchStarts.length < 2 || patternTokenLen <= 0) return [];

  const tokens = buildPointValueTokens(pointValues);
  const gaps: number[] = [];
  for (let i = 0; i < matchStarts.length - 1; i += 1) {
    const from = matchStarts[i]! + patternTokenLen;
    const to = matchStarts[i + 1]! - 1;
    if (from > to) {
      gaps.push(1);
      continue;
    }
    const runCount = tokens.slice(from, to + 1).filter((token) => token.isRun).length;
    gaps.push(runCount > 0 ? runCount : 1);
  }
  return gaps;
}

/** @deprecated digit 기준 gap (구 구현) */
export function computeLegacyGapSequence(
  pointValues: string,
  matchStarts: readonly number[],
  patternLen: number,
): number[] {
  if (matchStarts.length < 2 || patternLen <= 0) return [];

  const digitToToken = buildDigitToTokenIndex(pointValues);
  const gaps: number[] = [];

  for (let i = 0; i < matchStarts.length - 1; i += 1) {
    const endDigitIdx = matchStarts[i]! + patternLen - 1;
    const nextStart = matchStarts[i + 1]!;
    const endToken = digitToToken[endDigitIdx];
    const nextToken = digitToToken[nextStart];
    if (endToken === undefined || nextToken === undefined) continue;

    gaps.push(Math.max(1, nextToken - endToken));
  }

  return gaps;
}

function resolveCodeInput(
  codeStr: string,
  dbCode: CodeMatchInput | undefined,
  mainBand: DigitBand,
): CodeMatchInput {
  const catalog = getLegacyStepCodeDefinition(codeStr, mainBand);
  return {
    id: dbCode?.id ?? 0,
    code: codeStr,
    type: dbCode?.type?.trim() || catalog?.type || '',
    description: dbCode?.description?.trim() || catalog?.description || '',
  };
}

export function buildLegacyCodeContentRow(
  pointValues: string,
  code: CodeMatchInput,
  mainBand: DigitBand,
): LegacyCodeContentRow {
  const input = resolveCodeInput(code.code, code, mainBand);
  const detailDigits = pointValues.replace(/,/g, '');
  const gaps = computeLegacyCodeContentGaps(detailDigits, input.code, input.description ?? '');

  return {
    code: input.code,
    type: input.type,
    matchKind: 'detailGrid',
    matchCount: gaps.length > 0 ? gaps.length + 1 : 0,
    gaps,
    content: gaps.join(','),
  };
}

export interface BuildLegacyCodeContentOptions {
  codeOrder?: readonly string[];
}

export function buildLegacyCodeContentRows(
  result: AnalysisResult,
  codes: CodeMatchInput[],
  side: DigitClass,
  options?: BuildLegacyCodeContentOptions,
): LegacyCodeContentRow[] {
  const mainBand: DigitBand = side === 'low' ? 'low' : 'high';
  const pointValues = filterDigitsByClass(result.digits, side);
  const codeByKey = new Map(codes.map((c) => [c.code, c]));
  const order = options?.codeOrder ?? getLegacyStepCodeOrder(mainBand);

  return order.map((codeStr) => {
    const input = resolveCodeInput(codeStr, codeByKey.get(codeStr), mainBand);
    return buildLegacyCodeContentRow(pointValues, input, mainBand);
  });
}

export function formatLegacyCodeContent(gaps: readonly number[]): string {
  return gaps.join(',');
}

export function findDigitPatternStarts(pointValues: string, pattern: string): number[] {
  if (!pattern || pattern.length === 0 || pointValues.length < pattern.length) return [];

  const starts: number[] = [];
  for (let i = 0; i <= pointValues.length - pattern.length; i += 1) {
    if (pointValues.slice(i, i + pattern.length) === pattern) {
      starts.push(i);
    }
  }
  return starts;
}

export { LEGACY_STEP2_CODE_ORDER, LEGACY_STEP3_CODE_ORDER };
