/**
 * ③ 세분화 digit — STEP2/STEP3 코드명 「내용」 기반 repeat/transition
 * - 마지막 digit → 코드명 (예: 0 → 01)
 * - 코드 content(gap 시퀀스)를 패턴 흐름으로만 판단 (Values ≠ digit, 빈도 합산 없음)
 */

import type { AnalysisResult, CodeMatchInput, DigitClass } from './analysisEngine';
import { filterDigitsByClass } from './analysisEngine';
import {
  buildLegacyCodeContentRow,
  type LegacyCodeContentRow,
} from './legacyCodeContentEngine';
import { getLegacyStepCodeDefinition } from '../fixtures/legacy-step-code-catalog';
import {
  dominantPhaseFromCodeFlow,
  formatCodeFlowVotes,
  resolvePrimaryCodeForDigit,
  scoreAnchorDigitCodeFlow,
} from './legacyCodeFlowAnalysis';
import {
  getDigitSubBand,
  getSubBandLabel,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';
import {
  findLastDigitInMainBand,
  findLastDigitInSubBand,
  virtualMasterDigits,
} from './subBandRepeatJudgment';
import { resolveAnchorDigitForSubBand } from './subBandCrossRefinement';
import { wouldFormRepetitivePattern } from './patternRepeatGuard';
import type { PatternFlowPickResult } from './patternFlowPick';
import { pickDigitByPatternFlow } from './patternFlowPick';

export function resolveLegacyCodeForLastDigit(lastDigit: number, mainBand: DigitBand): string {
  return resolvePrimaryCodeForDigit(lastDigit, mainBand);
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

export function buildLegacyCodeContentForLastDigit(
  result: AnalysisResult,
  mainBand: DigitBand,
  lastDigit: number,
  codes: readonly CodeMatchInput[],
): { codeName: string; row: LegacyCodeContentRow } {
  const codeName = resolveLegacyCodeForLastDigit(lastDigit, mainBand);
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const pointValues = filterDigitsByClass(result.digits, side);
  const codeByKey = new Map(codes.map((c) => [c.code, c]));
  const input = resolveCodeInput(codeName, codeByKey.get(codeName), mainBand);
  const row = buildLegacyCodeContentRow(pointValues, input, mainBand);
  return { codeName, row };
}

function pickTransitionDigitInPool(
  pool: readonly number[],
  lastDigit: number,
  prefix: string,
): number {
  const alt = pool.find((d) => d !== lastDigit && !wouldFormRepetitivePattern(prefix, d));
  if (alt !== undefined) return alt;
  return pool.find((d) => d !== lastDigit) ?? pool[0]!;
}

/** STEP2/3 코드 content gap 시퀀스 → digit repeat/transition */
export function pickDigitByLegacyCodeContent(
  pool: readonly number[],
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
  codes: readonly CodeMatchInput[],
): PatternFlowPickResult | null {
  if (pool.length === 0) return null;

  const mainBand = subBand === 'lowLow' || subBand === 'lowHigh' ? 'low' : 'high';
  const context = virtualMasterDigits(result, prefix);
  const lastDigit =
    resolveAnchorDigitForSubBand(context, subBand, pool) ??
    findLastDigitInSubBand(context, subBand) ??
    findLastDigitInMainBand(context, mainBand);

  if (lastDigit === null || !pool.includes(lastDigit)) {
    return null;
  }

  const currentSub = getDigitSubBand(lastDigit);
  if (!currentSub) return null;

  const flowScore = scoreAnchorDigitCodeFlow(
    result,
    mainBand,
    lastDigit,
    currentSub,
    codes,
    resolvePrimaryCodeForDigit(lastDigit, mainBand),
  );
  if (flowScore.votes.length === 0) return null;

  const phase = dominantPhaseFromCodeFlow(flowScore);
  const codeSummary = flowScore.consultedCodes.join('+');
  const voteSummary = formatCodeFlowVotes(flowScore.votes);

  if (phase === 'repeat') {
    if (!wouldFormRepetitivePattern(prefix, lastDigit)) {
      return {
        digit: lastDigit,
        mode: 'repeat',
        reason: `③ [${codeSummary}] ${voteSummary} · digit ${lastDigit} 유지`,
      };
    }
  }

  const transitionDigit = pickTransitionDigitInPool(pool, lastDigit, prefix);
  return {
    digit: transitionDigit,
    mode: 'transition',
    reason: `③ [${codeSummary}] ${voteSummary} · digit ${transitionDigit} 전환`,
  };
}

/** legacy code content 우선, 없으면 S″ pattern flow fallback */
export function pickDigitWithLegacyCodeOrFlow(
  pool: readonly number[],
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
  codes: readonly CodeMatchInput[],
): PatternFlowPickResult {
  const fromCode = pickDigitByLegacyCodeContent(pool, result, prefix, subBand, codes);
  if (fromCode) return fromCode;
  return pickDigitByPatternFlow(pool, result, prefix, subBand);
}

export function getSubBandLabelForPick(sub: DigitSubBand): string {
  return getSubBandLabel(sub);
}
