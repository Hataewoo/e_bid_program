/**
 * 10 Code Value patterns → phase/state signals ONLY.
 *
 * Pattern Code Values (S′: 1,1,2,4…) express run length / marker progress — never master digits.
 * This module outputs PatternStateSignal (no digit fields).
 * Master digit scoring happens in applyPatternStateSignalsToMasterDigitScores().
 */

import type { AnalysisResult, DigitClass } from './analysisEngine';
import {
  CODE_VALUE_SUB_DETAIL_RULES,
  analyzeCodeValueSubDetail,
  extractCodeValuesFromBaseSequence,
  type CodeValueSubPatterns,
} from './codeValueSubAnalysis';
import {
  buildPointValueTokens,
  filterPointValuesToSubBand,
  getSidePointValues,
  type PointValueToken,
} from './pointValuesCodeFlow';
import { getSubBandMainBand, type DigitSubBand } from './digitSubBand';
import { inferSubBandPhaseFromOneBetween, type SubBandPhase } from './subBandRepeatJudgment';
import { sliceRecentDigitScoreTail } from './recentCompare';
import {
  CLUSTER_DIMINISHING_FACTOR,
  DIGIT_PREDICTION_WEIGHTS,
  getPatternClusterId,
  patternReliabilityConfidenceCap,
  patternReliabilityMultiplier,
} from './digitPredictionWeights';
import {
  asPatternCodeValue,
  type MasterDigit,
  type PatternCodeValue,
  masterDigitsZeroToNine,
} from './digitTypes';
import { masterDigitEvidenceInSubBand } from './masterDigitSequence';

export { masterDigitsInSubBandSequence, masterDigitCandidatesForPhase } from './masterDigitSequence';

export type PatternRunExpectation = 'continue' | 'break' | 'uncertain';
export type PatternBandBehavior = 'stay' | 'switch' | 'uncertain';

/** Pattern interpretation only — no master digit fields. */
export interface PatternStateSignal {
  patternKey: string;
  patternField: keyof CodeValueSubPatterns;
  predictedPhase: SubBandPhase;
  runExpectation: PatternRunExpectation;
  bandBehavior: PatternBandBehavior;
  confidence: number;
  reason: string;
}

/** @deprecated use PatternStateSignal — kept for migration references */
export type PatternPredictionSignal = PatternStateSignal & {
  phase: SubBandPhase;
  supportedDigits?: never;
};

function trailingRunLength(seq: readonly PatternCodeValue[]): number {
  if (seq.length === 0) return 0;
  const last = seq[seq.length - 1]!;
  let n = 1;
  for (let i = seq.length - 2; i >= 0; i -= 1) {
    if (seq[i] !== last) break;
    n += 1;
  }
  return n;
}

function trailingCountSinceMarkerOne(sPrime: readonly PatternCodeValue[]): number {
  let count = 0;
  for (let i = sPrime.length - 1; i >= 0; i -= 1) {
    if (sPrime[i] === 1) break;
    count += 1;
  }
  return count;
}

function toPatternSequence(tokens: readonly PointValueToken[]): PatternCodeValue[] {
  return tokens.map((t) => asPatternCodeValue(t.value));
}

function inferFieldPhase(
  field: keyof CodeValueSubPatterns,
  sPrime: readonly PatternCodeValue[],
  side: DigitClass,
  currentSub: DigitSubBand,
): { phase: SubBandPhase; confidence: number; reason: string } | null {
  const patterns = extractCodeValuesFromBaseSequence([...sPrime], side);
  const hints = (patterns[field] ?? []).filter((v) => v > 0);
  if (hints.length === 0) return null;

  const lastHint = hints[hints.length - 1]!;
  const rule = CODE_VALUE_SUB_DETAIL_RULES.find((r) => r.field === field);
  const label = rule?.code ?? field;

  if (field === 'oneBetween') {
    const ob = inferSubBandPhaseFromOneBetween(sPrime, side, currentSub);
    if (!ob) return null;
    const conf = ob.phase === 'repeat' ? 0.75 : 0.82;
    return { phase: ob.phase, confidence: conf, reason: `${label}: ${ob.label}` };
  }

  if (field === 'oneDuplicate') {
    const run = trailingRunLength(sPrime);
    const expected = Math.max(1, Math.round(lastHint));
    if (run < expected) {
      return {
        phase: 'repeat',
        confidence: Math.min(0.9, 0.5 + (run / expected) * 0.4),
        reason: `${label} run ${run}/${expected} → 유지`,
      };
    }
    return {
      phase: 'transition',
      confidence: Math.min(0.88, 0.55 + (run - expected) * 0.08),
      reason: `${label} run ${run}≥${expected} → 전환`,
    };
  }

  if (field === 'threeOrMore' || field === 'fiveOrMore') {
    return inferCountThresholdPhase(field, sPrime, label);
  }

  const trailingSinceOne = trailingCountSinceMarkerOne(sPrime);
  const markerProgress = trailingSinceOne / Math.max(1, lastHint);
  if (markerProgress < 0.85) {
    return {
      phase: 'repeat',
      confidence: Math.min(0.8, 0.4 + (1 - markerProgress) * 0.35),
      reason: `${label} 진행 ${trailingSinceOne}/${lastHint} → 유지`,
    };
  }
  return {
    phase: 'transition',
    confidence: Math.min(0.82, 0.45 + markerProgress * 0.35),
    reason: `${label} 진행 ${trailingSinceOne}≥${lastHint} → 전환`,
  };
}

/**
 * 3이상 / 5이상 — threshold run occurrence state, not "always repeat until threshold".
 * Uses tail run structure only (no future-frequency hardcoding).
 */
function inferCountThresholdPhase(
  field: 'threeOrMore' | 'fiveOrMore',
  sPrime: readonly PatternCodeValue[],
  label: string,
): { phase: SubBandPhase; confidence: number; reason: string } {
  const threshold = field === 'fiveOrMore' ? 5 : 3;
  const run = trailingRunLength(sPrime);
  const lastVal = sPrime[sPrime.length - 1]!;

  if (run >= threshold) {
    return {
      phase: 'transition',
      confidence: Math.min(0.72, 0.48 + (run - threshold + 1) * 0.05),
      reason: `${label} 꼬리 run ${run}≥${threshold} (임계 충족) → 전환`,
    };
  }

  if (run === 1) {
    if (lastVal >= 2 && lastVal < threshold) {
      return {
        phase: 'repeat',
        confidence: 0.42,
        reason: `${label} run길이 ${lastVal} 진행 중 → 유지(약)`,
      };
    }
    return {
      phase: 'transition',
      confidence: 0.38,
      reason: `${label} 단일 tail(${lastVal}) → 전환`,
    };
  }

  if (run + 1 >= threshold) {
    return {
      phase: 'transition',
      confidence: 0.52,
      reason: `${label} run ${run}, 임계 ${threshold} 직전 → 전환`,
    };
  }

  return {
    phase: 'repeat',
    confidence: Math.min(0.5, 0.32 + (run / threshold) * 0.18),
    reason: `${label} run ${run}<${threshold} → 유지(약)`,
  };
}

function calibratePatternConfidence(
  field: keyof CodeValueSubPatterns,
  rawConfidence: number,
  allPhases: readonly SubBandPhase[],
  myPhase: SubBandPhase,
): number {
  let conf = rawConfidence;

  const cap = patternReliabilityConfidenceCap(field);
  if (cap !== undefined) conf = Math.min(conf, cap);

  const reliability = patternReliabilityMultiplier(field);
  if (reliability < 0.15) conf = Math.min(conf, 0.2);

  if (allPhases.length >= 3) {
    const agree = allPhases.filter((p) => p === myPhase).length;
    const ratio = agree / allPhases.length;
    if (ratio < 0.35) conf *= 0.75;
    else if (ratio > 0.75) conf = Math.min(conf * 1.05, 0.95);
  }

  return Math.max(0.05, Math.min(DIGIT_PREDICTION_WEIGHTS.patternSignalMaxPerPattern, conf));
}

function clusterDiminishMultiplier(indexInCluster: number): number {
  return Math.pow(CLUSTER_DIMINISHING_FACTOR, indexInCluster);
}

function phaseToRunExpectation(phase: SubBandPhase): PatternRunExpectation {
  if (phase === 'repeat') return 'continue';
  if (phase === 'transition') return 'break';
  return 'uncertain';
}

function phaseToBandBehavior(phase: SubBandPhase, field: keyof CodeValueSubPatterns): PatternBandBehavior {
  if (field === 'oneBetween' && phase === 'transition') return 'switch';
  if (phase === 'repeat') return 'stay';
  if (phase === 'transition') return 'switch';
  return 'uncertain';
}

/** Master digits in target sub-band — see masterDigitSequence.ts (source: result.digits). */

/**
 * Apply pattern state signals to MasterDigit scores using actual master sequence only.
 * Pattern Code Values never become digit indices here.
 */
export function applyPatternStateSignalsToMasterDigitScores(
  signals: readonly PatternStateSignal[],
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): Map<MasterDigit, MasterDigitPatternScore> {
  const acc = new Map<MasterDigit, MasterDigitPatternScore>();
  const w = DIGIT_PREDICTION_WEIGHTS;

  type ScoredSig = PatternStateSignal & { effectiveWeight: number };
  const clusterCounts = new Map<string, number>();

  const ranked: ScoredSig[] = signals
    .map((sig) => ({
      ...sig,
      effectiveWeight: sig.confidence * patternReliabilityMultiplier(sig.patternField),
    }))
    .sort((a, b) => b.effectiveWeight - a.effectiveWeight);

  for (const sig of ranked) {
    const clusterId = getPatternClusterId(sig.patternField);
    const clusterKey = clusterId ? `${clusterId}:${sig.predictedPhase}` : null;
    let diminish = 1;
    if (clusterKey) {
      const idx = clusterCounts.get(clusterKey) ?? 0;
      diminish = clusterDiminishMultiplier(idx);
      clusterCounts.set(clusterKey, idx + 1);
    }

    const evidenceList = masterDigitEvidenceInSubBand(
      sig.predictedPhase,
      result,
      prefix,
      subBand,
    );
    if (evidenceList.length === 0) continue;

    const weightSum = evidenceList.reduce((s, e) => s + e.weight, 0);
    const reliability = patternReliabilityMultiplier(sig.patternField);
    const base = sig.confidence * reliability * w.patternSignal * diminish;

    for (const ev of evidenceList) {
      const share = base * (ev.weight / Math.max(weightSum, 1));
      const prev = acc.get(ev.digit) ?? { score: 0, reasons: [] };
      const nextScore = Math.min(w.patternSignalPerDigitCap, prev.score + share);
      const dimLabel = diminish < 1 ? `×${diminish.toFixed(2)}` : '';
      acc.set(ev.digit, {
        score: nextScore,
        reasons: [
          ...prev.reasons,
          `${sig.patternKey}(${sig.predictedPhase})${dimLabel}·master ${ev.digit} [${ev.evidence}]`,
        ],
      });
    }
  }

  for (const d of masterDigitsZeroToNine()) {
    if (!acc.has(d)) acc.set(d, { score: 0, reasons: [] });
  }

  return acc;
}

export interface PatternStateSignalOptions {
  /** Diagnostic-only override; default RECENT_DIGIT_SCORE_TAIL (12) */
  tailLength?: number;
}

/** Compute independent phase/state signal per Code Value pattern field (no digits). */
export function computePatternStateSignals(
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
  options?: PatternStateSignalOptions,
): PatternStateSignal[] {
  const tailLen = options?.tailLength;
  const mainBand = getSubBandMainBand(subBand);
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const pointValues = getSidePointValues(result, prefix, side);
  let filtered = filterPointValuesToSubBand(pointValues, subBand);
  if (filtered.length === 0) filtered = pointValues;
  const tokens =
    tailLen !== undefined
      ? sliceRecentDigitScoreTail(buildPointValueTokens(filtered), tailLen)
      : sliceRecentDigitScoreTail(buildPointValueTokens(filtered));
  const sPrime = toPatternSequence(tokens);

  if (sPrime.length === 0) return [];

  const detail = analyzeCodeValueSubDetail(sPrime, side);
  const draft: Array<{
    rule: (typeof CODE_VALUE_SUB_DETAIL_RULES)[number];
    inferred: { phase: SubBandPhase; confidence: number; reason: string };
  }> = [];

  for (const rule of CODE_VALUE_SUB_DETAIL_RULES) {
    const row = detail.rows.find((r) => r.code === rule.code);
    if (!row || row.values.length === 0) continue;

    const inferred = inferFieldPhase(rule.field, sPrime, side, subBand);
    if (!inferred) continue;
    draft.push({ rule, inferred });
  }

  const allPhases = draft.map((d) => d.inferred.phase);
  const signals: PatternStateSignal[] = [];

  for (const { rule, inferred } of draft) {
    const confidence = calibratePatternConfidence(
      rule.field,
      inferred.confidence,
      allPhases,
      inferred.phase,
    );

    signals.push({
      patternKey: rule.code,
      patternField: rule.field,
      predictedPhase: inferred.phase,
      runExpectation: phaseToRunExpectation(inferred.phase),
      bandBehavior: phaseToBandBehavior(inferred.phase, rule.field),
      confidence,
      reason: inferred.reason,
    });
  }

  return signals;
}

/** @deprecated alias */
export const computePatternPredictionSignals = computePatternStateSignals;

export interface MasterDigitPatternScore {
  score: number;
  reasons: string[];
}

/** Bridge used by digitCandidateScoring — state signals → master digit scores. */
export function patternStateSignalsToMasterDigitScores(
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): Map<MasterDigit, MasterDigitPatternScore> {
  const signals = computePatternStateSignals(result, prefix, subBand);
  return applyPatternStateSignalsToMasterDigitScores(signals, result, prefix, subBand);
}

/** @deprecated use patternStateSignalsToMasterDigitScores */
export function patternSignalsToDigitScores(
  signals: readonly PatternStateSignal[],
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): Map<MasterDigit, MasterDigitPatternScore> {
  return applyPatternStateSignalsToMasterDigitScores(signals, result, prefix, subBand);
}
