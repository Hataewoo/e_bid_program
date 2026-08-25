/**
 * anchor digit 기준 — STEP2/3 관련 코드·내용 다중 패턴 흐름 집계
 * (23·24·234·34 등 object digit 일치 코드를 모두 참고)
 */

import type { AnalysisResult, CodeMatchInput, DigitClass } from './analysisEngine';
import { filterDigitsByClass } from './analysisEngine';
import {
  buildLegacyCodeContentRow,
  type LegacyCodeContentRow,
} from './legacyCodeContentEngine';
import {
  getLegacyStepCodeDefinition,
  getLegacyStepCodeOrder,
} from '../fixtures/legacy-step-code-catalog';
import { resolveLegacyCodeObjectBase } from './legacyEmyoungAlgorithms';
import {
  getDigitSubBand,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';
import { inferPhaseFromSequence, type SubBandPhase } from './subBandRepeatJudgment';

const CODE_FLOW_WEIGHT = 3;

export interface CodeFlowVote {
  codeName: string;
  phase: SubBandPhase;
  label: string;
  gapCount: number;
}

export interface AnchorCodeFlowScore {
  anchorDigit: number;
  subBand: DigitSubBand;
  repeatWeight: number;
  transitionWeight: number;
  netStay: number;
  votes: CodeFlowVote[];
  consultedCodes: string[];
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

/** anchor digit — object digit(코드 objectDigits 선두) 일치 + 기본 매핑 코드 */
export function relevantLegacyCodesForAnchorDigit(
  digit: number,
  mainBand: DigitBand,
  primaryCode?: string,
): readonly string[] {
  const order = getLegacyStepCodeOrder(mainBand);
  const digitChar = String(digit);
  const matched = order.filter((code) => {
    const { objectDigits } = resolveLegacyCodeObjectBase(code);
    return objectDigits.startsWith(digitChar);
  });

  const merged = new Set<string>(matched);
  if (primaryCode) merged.add(primaryCode);

  return [...merged];
}

export function buildLegacyCodeContentForCodeName(
  result: AnalysisResult,
  mainBand: DigitBand,
  codeName: string,
  codes: readonly CodeMatchInput[],
): LegacyCodeContentRow {
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const pointValues = filterDigitsByClass(result.digits, side);
  const codeByKey = new Map(codes.map((c) => [c.code, c]));
  const input = resolveCodeInput(codeName, codeByKey.get(codeName), mainBand);
  return buildLegacyCodeContentRow(pointValues, input, mainBand);
}

/** primaryCode — digit→코드 1:1 매핑 (없으면 object digit 후보만) */
export function scoreAnchorDigitCodeFlow(
  result: AnalysisResult,
  mainBand: DigitBand,
  anchorDigit: number,
  subBand: DigitSubBand,
  codes: readonly CodeMatchInput[],
  primaryCode?: string,
): AnchorCodeFlowScore {
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const codeNames = relevantLegacyCodesForAnchorDigit(anchorDigit, mainBand, primaryCode);
  const votes: CodeFlowVote[] = [];
  let repeatWeight = 0;
  let transitionWeight = 0;

  for (const codeName of codeNames) {
    const row = buildLegacyCodeContentForCodeName(result, mainBand, codeName, codes);
    if (row.gaps.length === 0) continue;

    const phase = inferPhaseFromSequence(row.gaps, side, subBand, anchorDigit);
    votes.push({
      codeName,
      phase: phase.phase,
      label: phase.label,
      gapCount: row.gaps.length,
    });
    if (phase.phase === 'repeat') repeatWeight += CODE_FLOW_WEIGHT;
    else transitionWeight += CODE_FLOW_WEIGHT;
  }

  return {
    anchorDigit,
    subBand,
    repeatWeight,
    transitionWeight,
    netStay: repeatWeight - transitionWeight,
    votes,
    consultedCodes: votes.map((v) => v.codeName),
  };
}

export function formatCodeFlowVotes(votes: readonly CodeFlowVote[]): string {
  if (votes.length === 0) return '코드 content 없음';
  return votes.map((v) => `${v.codeName}:${v.phase === 'repeat' ? '유지' : '전환'}`).join(', ');
}

/** 다중 코드 집계 — repeat/transition 우세 */
export function dominantPhaseFromCodeFlow(
  score: AnchorCodeFlowScore,
): SubBandPhase {
  return score.repeatWeight > score.transitionWeight ? 'repeat' : 'transition';
}

export function resolvePrimaryCodeForDigit(
  digit: number,
  mainBand: DigitBand,
): string {
  const low: Record<number, string> = { 0: '01', 1: '01', 2: '23', 3: '23', 4: '34' };
  const high: Record<number, string> = { 5: '56', 6: '56', 7: '67', 8: '89', 9: '89' };
  const map = mainBand === 'low' ? low : high;
  return map[digit] ?? (mainBand === 'low' ? '01' : '56');
}

export function anchorDigitInSubBand(digit: number, subBand: DigitSubBand): boolean {
  return getDigitSubBand(digit) === subBand;
}
