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

/** 1사이·run·1중복 동점이면 전환 우선 (1사이 형제 세분화 신호 존중) */
function resolveWeightedPhase(repeatWeight: number, transitionWeight: number): SubBandPhase {
  return repeatWeight > transitionWeight ? 'repeat' : 'transition';
}

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

/** Master 꼬리 — 특정 세분화(저저·저고 등)에서 가장 최근 digit */
export function findLastDigitInSubBand(context: string, subBand: DigitSubBand): number | null {
  for (let i = context.length - 1; i >= 0; i -= 1) {
    const d = Number(context[i]);
    if (!Number.isInteger(d) || d < 0 || d > 9) continue;
    if (getDigitSubBand(d) === subBand) return d;
  }
  return null;
}

function subBandOfLastInContext(context: string, mainBand: DigitBand): DigitSubBand | null {
  const d = findLastDigitInMainBand(context, mainBand);
  return d !== null ? getDigitSubBand(d) : null;
}

/** S″ 꼬리 — 마커 1 이후 Values 개수 (1사이 진행도) */
function trailingCountSinceMarkerOne(sPrime: readonly number[]): number {
  let count = 0;
  for (let i = sPrime.length - 1; i >= 0; i -= 1) {
    if (sPrime[i] === 1) break;
    count += 1;
  }
  return count;
}

/**
 * ② 세분화 1순위 — CodeValues 「1 사이」 패턴으로 run 유지/종료 판단.
 * Values(1,2,3…)는 run·사이 횟수 참고만 — digit 매핑 금지.
 */
export function inferSubBandPhaseFromOneBetween(
  sPrime: readonly number[],
  side: DigitClass,
  currentSub: DigitSubBand,
): { phase: SubBandPhase; label: string } | null {
  if (sPrime.length === 0) return null;

  const patterns = extractCodeValuesFromBaseSequence([...sPrime], side);
  const oneBetweenHints = (patterns.oneBetween ?? []).filter((v) => v > 0);
  if (oneBetweenHints.length === 0) return null;

  const expectedBetween = oneBetweenHints[oneBetweenHints.length - 1]!;
  const trailingSinceOne = trailingCountSinceMarkerOne(sPrime);
  const subLabel = getSubBandLabel(currentSub);
  const hintLabel = oneBetweenHints.join(',');

  if (trailingSinceOne === 0 && sPrime.at(-1) === 1) {
    return {
      phase: 'transition',
      label: `${subLabel} 1사이 [${hintLabel}] — 마커 1 도달 → 형제 세분화`,
    };
  }

  if (trailingSinceOne < expectedBetween) {
    return {
      phase: 'repeat',
      label: `${subLabel} 1사이 [${hintLabel}] — 1 사이 지속 (${trailingSinceOne}/${expectedBetween})`,
    };
  }

  return {
    phase: 'transition',
    label: `${subLabel} 1사이 [${hintLabel}] — 1 사이 종료 (${trailingSinceOne}≥${expectedBetween}) → 형제 세분화`,
  };
}

/** S″/코드 시퀀스 꼬리 — 동일 value 연속 run */
function trailingValueRun(sequence: readonly number[]): number {
  if (sequence.length === 0) return 0;
  const last = sequence.at(-1)!;
  let run = 1;
  for (let i = sequence.length - 2; i >= 0; i -= 1) {
    if (sequence[i] === last) run += 1;
    else break;
  }
  return run;
}

/** run 기대값 — 꼬리 힌트 최근 3개 평균 (전체 S 평균은 run 종료 신호를 늦게 만듦) */
function expectedRunFromTailHints(
  runHints: readonly number[],
  fallbackRun: number,
): number {
  const tailHints = runHints.slice(-3);
  if (tailHints.length > 0) {
    return Math.round(tailHints.reduce((a, b) => a + b, 0) / tailHints.length);
  }
  return Math.max(fallbackRun, 1);
}

/**
 * ① 저·고 S run — 1사이 최우선(×3), 1중복(×2), run(×1) 가중 종합.
 * liveRunLength = Master 꼬리 실제 run (S 꼬리 run과 별도).
 */
export function inferMainBandPhaseFromSequence(
  sSequence: readonly number[],
  side: DigitClass,
  liveRunLength: number,
  lastDigit: number,
): { phase: SubBandPhase; label: string } {
  const bandLabel = side === 'low' ? '저점(0~4)' : '고점(5~9)';
  const placeholderSub: DigitSubBand = side === 'low' ? 'lowLow' : 'highHigh';

  if (sSequence.length === 0) {
    return {
      phase: 'transition',
      label: `${bandLabel} [digit ${lastDigit}] S 시퀀스 없음 → 전환`,
    };
  }

  let repeatWeight = 0;
  let transitionWeight = 0;
  const parts: string[] = [];

  const oneBetween = inferSubBandPhaseFromOneBetween(sSequence, side, placeholderSub);
  if (oneBetween) {
    const w = 3;
    if (oneBetween.phase === 'repeat') repeatWeight += w;
    else transitionWeight += w;
    const subLabel = getSubBandLabel(placeholderSub);
    const oneBetweenNote = oneBetween.label.replace(`${subLabel} `, '').replace(subLabel, bandLabel);
    parts.push(`1사이(×${w}): ${oneBetweenNote}`);
  }

  const patterns = extractCodeValuesFromBaseSequence([...sSequence], side);
  const runHints = [
    ...(patterns.oneDuplicate ?? []),
    ...(patterns.threeOrMore ?? []),
    ...(patterns.fiveOrMore ?? []),
  ].filter((v) => v > 0);
  const expectedRun = expectedRunFromTailHints(runHints, liveRunLength);

  if (liveRunLength > 0 && liveRunLength < expectedRun) {
    repeatWeight += 1;
    parts.push(`run(×1): 지속 ${liveRunLength}/${expectedRun}`);
  } else if (liveRunLength >= expectedRun && expectedRun > 0) {
    transitionWeight += 1;
    parts.push(`run(×1): 종료 ${liveRunLength}≥${expectedRun}`);
  }

  if ((patterns.oneDuplicate?.length ?? 0) > 0 && liveRunLength <= 1) {
    repeatWeight += 2;
    parts.push('1중복(×2): run');
  }

  if (repeatWeight === 0 && transitionWeight === 0) {
    transitionWeight = 1;
    parts.push('종합(×1): 전환');
  }

  const phase = resolveWeightedPhase(repeatWeight, transitionWeight);
  return {
    phase,
    label: `${bandLabel} [digit ${lastDigit}] ${parts.join(' | ')} → ${phase === 'repeat' ? '유지' : '전환'}`,
  };
}

export interface InferPhaseOptions {
  /** S″에 1사이 없을 때 Side S run 1사이 fallback */
  sideSRunFallback?: readonly number[];
}

/**
 * 세분화 유지/전환 — 1사이 최우선(×3), 1중복(×2), run(×1) 가중 종합.
 * 마지막 digit 기준으로 판단 (lastDigit는 라벨·근거용).
 */
export function inferPhaseFromSequence(
  sPrime: readonly number[],
  side: DigitClass,
  currentSub: DigitSubBand,
  lastDigit: number,
  options?: InferPhaseOptions,
): { phase: SubBandPhase; label: string } {
  const subLabel = getSubBandLabel(currentSub);

  if (sPrime.length === 0) {
    return {
      phase: 'transition',
      label: `${subLabel} [digit ${lastDigit}] 시퀀스 없음 → 전환`,
    };
  }

  let repeatWeight = 0;
  let transitionWeight = 0;
  const parts: string[] = [];

  let oneBetween = inferSubBandPhaseFromOneBetween(sPrime, side, currentSub);
  let oneBetweenSource = 'S″';
  if (!oneBetween && options?.sideSRunFallback && options.sideSRunFallback.length > 0) {
    const fallbackOb = inferSubBandPhaseFromOneBetween(options.sideSRunFallback, side, currentSub);
    if (fallbackOb) {
      oneBetween = fallbackOb;
      oneBetweenSource = 'Side S';
    }
  }
  if (oneBetween) {
    const w = 3;
    if (oneBetween.phase === 'repeat') repeatWeight += w;
    else transitionWeight += w;
    const note = oneBetween.label.replace(`${subLabel} `, '');
    parts.push(`1사이(×${w})[${oneBetweenSource}]: ${note}`);
  }

  const patterns = extractCodeValuesFromBaseSequence([...sPrime], side);
  const trailingRun = trailingValueRun(sPrime);
  const runHints = [
    ...(patterns.threeOrMore ?? []),
    ...(patterns.fiveOrMore ?? []),
    ...(patterns.oneDuplicate ?? []),
  ].filter((v) => v > 0);
  const expectedRun =
    runHints.length > 0
      ? Math.round(runHints.reduce((a, b) => a + b, 0) / runHints.length)
      : Math.max(trailingRun, 1);

  if (trailingRun > 0 && trailingRun < expectedRun) {
    repeatWeight += 1;
    parts.push(`run(×1): 지속 ${trailingRun}/${expectedRun}`);
  } else if (trailingRun >= expectedRun && expectedRun > 0) {
    transitionWeight += 1;
    parts.push(`run(×1): 종료 ${trailingRun}≥${expectedRun}`);
  }

  if ((patterns.oneDuplicate?.length ?? 0) > 0 && trailingRun <= 1) {
    repeatWeight += 2;
    parts.push('1중복(×2): run');
  }

  if (repeatWeight === 0 && transitionWeight === 0) {
    transitionWeight = 1;
    parts.push('종합(×1): 전환');
  }

  const phase = resolveWeightedPhase(repeatWeight, transitionWeight);
  return {
    phase,
    label: `${subLabel} [digit ${lastDigit}] ${parts.join(' | ')} → ${phase === 'repeat' ? '유지' : '전환'}`,
  };
}

/** Side Point Values S″ + Code/Values → 현재 세분화 구간 유지·전환 (마지막 digit 기준) */
export function inferSubBandPhase(
  result: AnalysisResult,
  prefix: string,
  mainBand: DigitBand,
  currentSub: DigitSubBand,
): { phase: SubBandPhase; label: string } {
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const context = virtualMasterDigits(result, prefix);
  const lastDigit = findLastDigitInMainBand(context, mainBand) ?? -1;
  const filtered = filterPointValuesToSubBand(getSidePointValues(result, prefix, side), currentSub);
  const sPrime = buildPointValueTokens(filtered).map((t) => t.value);
  const sideSRun = mainBand === 'low' ? result.lowRunLengths : result.highRunLengths;

  return inferPhaseFromSequence(sPrime, side, currentSub, lastDigit, { sideSRunFallback: sideSRun });
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
