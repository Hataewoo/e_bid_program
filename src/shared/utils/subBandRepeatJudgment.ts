/**
 * 세분화(저저·저고·고저·고고) — S″ Code/Values 패턴으로 동일 구간 유지 vs 형제 구간 전환
 *
 * prefix(가상 append)가 있으면: 원본 Master 끝 + append 를 하나의 가상 Master 로 보고 ② 재판단.
 * 4자리 chain 종료 후에는 호출측에서 prefix="" 로 원본 Master 로 복귀.
 */

import type { AnalysisResult, DigitClass } from './analysisEngine';
import { extractCodeValuesFromBaseSequence } from './codeValueSubAnalysis';
import {
  buildPointValueTokens,
  filterPointValuesToSubBand,
  getSidePointValues,
} from './pointValuesCodeFlow';
import {
  getDigitSubBand,
  getSubBandLabel,
  getSubBandMainBand,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';

export type SubBandPhase = 'repeat' | 'transition';

export interface SubBandPhaseResult {
  phase: SubBandPhase;
  label: string;
  currentSub: DigitSubBand | null;
  siblingSub: DigitSubBand | null;
}

/** run 유지/전환 — PV 패턴 점수와 경쟁 가능한 소폭 가점 (과도 고정 금지) */
const SUB_BAND_PHASE_NUDGE = 3.5;

/** 원본 Master + 사용자/chain append — 패턴 분석용 가상 Master */
export function virtualMasterDigits(result: AnalysisResult, prefix: string): string {
  return prefix.length > 0 ? result.digits + prefix : result.digits;
}

export function findLastDigitInMainBand(context: string, mainBand: DigitBand): number | null {
  for (let i = context.length - 1; i >= 0; i -= 1) {
    const d = Number(context[i]);
    if (!Number.isInteger(d) || d < 0 || d > 9) continue;
    const sub = getDigitSubBand(d);
    if (sub && getSubBandMainBand(sub) === mainBand) return d;
  }
  return null;
}

function subBandOfLastInContext(context: string, mainBand: DigitBand): DigitSubBand | null {
  const d = findLastDigitInMainBand(context, mainBand);
  return d !== null ? getDigitSubBand(d) : null;
}

/** Side Point Values S″ + Code/Values → 현재 세분화 구간 유지·전환 */
export function inferSubBandPhase(
  result: AnalysisResult,
  prefix: string,
  mainBand: DigitBand,
  currentSub: DigitSubBand,
): { phase: SubBandPhase; label: string } {
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const filtered = filterPointValuesToSubBand(getSidePointValues(result, prefix, side), currentSub);
  const tokens = buildPointValueTokens(filtered);
  const sPrime = tokens.map((t) => t.value);

  if (sPrime.length === 0) {
    return { phase: 'transition', label: `${getSubBandLabel(currentSub)} S″ 없음 → 전환 검토` };
  }

  const patterns = extractCodeValuesFromBaseSequence(sPrime, side);
  const runHints = [
    ...(patterns.threeOrMore ?? []),
    ...(patterns.fiveOrMore ?? []),
    ...(patterns.oneDuplicate ?? []),
  ].filter((v) => v > 0);

  const lastToken = tokens[tokens.length - 1];
  let trailingRun = 1;
  if (lastToken) {
    for (let i = tokens.length - 2; i >= 0; i -= 1) {
      if (tokens[i]!.sourceDigit === lastToken.sourceDigit) trailingRun += 1;
      else break;
    }
  }

  const expectedRun =
    runHints.length > 0
      ? Math.round(runHints.reduce((a, b) => a + b, 0) / runHints.length)
      : Math.max(trailingRun, 1);

  if (trailingRun > 0 && trailingRun < expectedRun) {
    return {
      phase: 'repeat',
      label: `${getSubBandLabel(currentSub)} run 지속 (${trailingRun}/${expectedRun})`,
    };
  }

  if (trailingRun >= expectedRun && expectedRun > 0) {
    return {
      phase: 'transition',
      label: `${getSubBandLabel(currentSub)} run 종료 (${trailingRun}≥${expectedRun}) → 형제 세분화`,
    };
  }

  if ((patterns.oneDuplicate?.length ?? 0) > 0 && trailingRun <= 1) {
    return { phase: 'repeat', label: `${getSubBandLabel(currentSub)} 1중복 run` };
  }

  return { phase: 'transition', label: `${getSubBandLabel(currentSub)} Code/Values 전환` };
}

/** prefix 없음 — 원본 Master 꼬리 기준 repeat/transition */
function applyOriginalMasterSubBandPhase(
  result: AnalysisResult,
  prefix: string,
  mainBand: DigitBand,
  scores: Partial<Record<DigitSubBand, number>>,
  candidates: readonly DigitSubBand[],
  reasons: string[],
): SubBandPhaseResult {
  const context = virtualMasterDigits(result, prefix);
  const lastDigit = findLastDigitInMainBand(context, mainBand);
  const currentSub = lastDigit !== null ? getDigitSubBand(lastDigit) : null;

  if (!currentSub || !candidates.includes(currentSub)) {
    return { phase: 'transition', label: '세분화 기준 digit 없음', currentSub: null, siblingSub: null };
  }

  const siblingSub = candidates.find((c) => c !== currentSub) ?? null;
  const phase = inferSubBandPhase(result, prefix, mainBand, currentSub);

  if (phase.phase === 'repeat') {
    scores[currentSub] = (scores[currentSub] ?? 0) + SUB_BAND_PHASE_NUDGE;
    reasons.push(`② ${phase.label} → ${getSubBandLabel(currentSub)} 유지 (+${SUB_BAND_PHASE_NUDGE})`);
  } else if (siblingSub) {
    scores[siblingSub] = (scores[siblingSub] ?? 0) + SUB_BAND_PHASE_NUDGE;
    reasons.push(`② ${phase.label} → ${getSubBandLabel(siblingSub)} 전환 (+${SUB_BAND_PHASE_NUDGE})`);
  }

  return { phase: phase.phase, label: phase.label, currentSub, siblingSub };
}

/**
 * prefix 있음 — append 를 Master 끝에 붙인 가상 Master 로 S″ 재판단.
 * append 구간이 원본 꼬리와 다른 세분화면 4자리 전체를 그 구간에 고정하지 않음.
 */
function applyVirtualAppendSubBandPhase(
  result: AnalysisResult,
  prefix: string,
  mainBand: DigitBand,
  scores: Partial<Record<DigitSubBand, number>>,
  candidates: readonly DigitSubBand[],
  reasons: string[],
): SubBandPhaseResult {
  const masterTailSub = subBandOfLastInContext(result.digits, mainBand);
  const appendSub = subBandOfLastInContext(prefix, mainBand);
  const virtualTailSub = subBandOfLastInContext(virtualMasterDigits(result, prefix), mainBand);

  reasons.push(
    `② 가상 Master (${result.digits.length}자+append ${prefix.length}자) [${prefix}] S″ 재판단`,
  );

  if (
    masterTailSub &&
    appendSub &&
    masterTailSub !== appendSub &&
    candidates.includes(masterTailSub)
  ) {
    scores[masterTailSub] = (scores[masterTailSub] ?? 0) + SUB_BAND_PHASE_NUDGE;
    reasons.push(
      `② 원본 꼬리 ${getSubBandLabel(masterTailSub)} → append ${getSubBandLabel(appendSub)} 후 ${getSubBandLabel(masterTailSub)} 패턴 복귀`,
    );
    return {
      phase: 'transition',
      label: '가상 append 세분화 재판단',
      currentSub: appendSub,
      siblingSub: masterTailSub,
    };
  }

  const masterTailDigit = findLastDigitInMainBand(result.digits, mainBand);
  const appendTailDigit = findLastDigitInMainBand(prefix, mainBand);
  if (
    masterTailSub &&
    appendSub &&
    masterTailSub === appendSub &&
    masterTailDigit !== null &&
    appendTailDigit !== null &&
    masterTailDigit !== appendTailDigit &&
    candidates.includes(appendSub)
  ) {
    const siblingSub = candidates.find((c) => c !== appendSub) ?? null;
    reasons.push(
      `② ${getSubBandLabel(appendSub)} digit ${masterTailDigit}→${appendTailDigit} — run 고정 해제 (형제 ${siblingSub ? getSubBandLabel(siblingSub) : '-'} 검토)`,
    );
    return {
      phase: 'transition',
      label: `${getSubBandLabel(appendSub)} digit 전환`,
      currentSub: appendSub,
      siblingSub,
    };
  }

  const currentSub = virtualTailSub ?? appendSub;
  if (!currentSub || !candidates.includes(currentSub)) {
    return { phase: 'transition', label: '가상 append', currentSub: null, siblingSub: null };
  }

  const siblingSub = candidates.find((c) => c !== currentSub) ?? null;
  const phase = inferSubBandPhase(result, prefix, mainBand, currentSub);

  if (phase.phase === 'repeat') {
    scores[currentSub] = (scores[currentSub] ?? 0) + SUB_BAND_PHASE_NUDGE;
    reasons.push(`② ${phase.label} → ${getSubBandLabel(currentSub)} (가상 Master +${SUB_BAND_PHASE_NUDGE})`);
  } else if (siblingSub) {
    scores[siblingSub] = (scores[siblingSub] ?? 0) + SUB_BAND_PHASE_NUDGE;
    reasons.push(`② ${phase.label} → ${getSubBandLabel(siblingSub)} (가상 Master +${SUB_BAND_PHASE_NUDGE})`);
  }

  return { phase: phase.phase, label: phase.label, currentSub, siblingSub };
}

export function applySubBandPhaseToScores(
  result: AnalysisResult,
  prefix: string,
  mainBand: DigitBand,
  scores: Partial<Record<DigitSubBand, number>>,
  candidates: readonly DigitSubBand[],
  reasons: string[],
): SubBandPhaseResult {
  if (prefix.length > 0) {
    return applyVirtualAppendSubBandPhase(result, prefix, mainBand, scores, candidates, reasons);
  }
  return applyOriginalMasterSubBandPhase(result, prefix, mainBand, scores, candidates, reasons);
}
