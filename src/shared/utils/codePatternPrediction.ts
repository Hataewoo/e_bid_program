import type {
  AnalysisResult,
  CodeValueStatRow,
  DigitClass,
  SidePatterns,
} from './analysisEngine';
import {
  analyzeMasterValue,
  collectPatternMatchStartIndices,
  parseRunClassSequence,
  resolvePatternFieldFromDescription,
  toClassSequence,
} from './analysisEngine';
import { getDigitBand, type DigitBand } from './digitSubBand';

export interface PatternPhaseState {
  phase: number;
  matchedLength: number;
  nextClass: DigitClass;
  newestPatIdx: number;
}

export interface PatternCodeMatch {
  code: string;
  description: string;
  sequence: DigitClass[];
  weight: number;
  matchedLength: number;
  phase: number;
}

export interface SidePatternRef {
  side: DigitClass;
  field: keyof SidePatterns;
}

export type RegisteredPattern =
  | {
      kind: 'sequence';
      code: string;
      description: string;
      sequence: DigitClass[];
    }
  | {
      kind: 'side';
      code: string;
      description: string;
      sideRef: SidePatternRef;
    };

export interface MasterCodeProfile {
  topCode: string | null;
  topDescription: string;
  topSequence: DigitClass[] | null;
  patternMatch: PatternCodeMatch | null;
  activePatterns: RegisteredPattern[];
}

export type PatternPhaseReason =
  | 'patternTransition'
  | 'sequenceRule'
  | 'runTiming'
  | 'fallback';

export interface BandDecision {
  targetBand: DigitBand;
  reason: PatternPhaseReason;
  matchedCode: string | null;
  matchedDescription: string;
  expectedClass: DigitClass;
  matchedLength: number;
  transitionProb: number;
}

export interface RankedDigit {
  digit: number;
  score: number;
  probability: number;
}

export interface CodePatternPrediction {
  profile: MasterCodeProfile;
  bandDecision: BandDecision;
  targetBand: DigitBand;
  rankedDigits: RankedDigit[];
  totalSignal: number;
  sampleCount: number;
  contextMatches: number;
}

function isDigitInClass(digit: number, cls: DigitClass): boolean {
  return cls === 'low' ? digit <= 4 : digit >= 5;
}

function classToBand(cls: DigitClass): DigitBand {
  return cls;
}

/** prefix 또는 master → digit 클래스 시퀀스 */
export function getLiveDigitClasses(prefix: string, masterDigits: string): DigitClass[] {
  const source = prefix.length > 0 ? prefix : masterDigits;
  if (!source) return [];
  return toClassSequence(source);
}

/** digit L/H 패턴에서 현재 위치·다음 구간 */
export function predictNextClassFromDigitPattern(
  digitClasses: DigitClass[],
  pattern: DigitClass[],
): PatternPhaseState {
  if (pattern.length === 0) {
    const tail = digitClasses[digitClasses.length - 1] ?? 'low';
    return { nextClass: tail, matchedLength: 0, phase: 0, newestPatIdx: -1 };
  }

  const n = pattern.length;
  const last = digitClasses[digitClasses.length - 1];
  if (last === undefined) {
    return { nextClass: pattern[0]!, matchedLength: 0, phase: 0, newestPatIdx: -1 };
  }

  let bestMatched = 0;
  let bestPhase = 0;

  for (let phase = 0; phase < n; phase += 1) {
    let matched = 0;
    const maxLen = Math.min(digitClasses.length, n);
    while (matched < maxLen) {
      const clsIdx = digitClasses.length - 1 - matched;
      const patIdx = (phase + n - 1 - matched) % n;
      if (digitClasses[clsIdx] !== pattern[patIdx]) break;
      matched += 1;
    }
    if (matched > bestMatched) {
      bestMatched = matched;
      bestPhase = phase;
    }
  }

  let newestPatIdx = -1;
  for (let phase = 0; phase < n; phase += 1) {
    const patIdx = (phase + n - 1) % n;
    if (last === pattern[patIdx]) {
      newestPatIdx = patIdx;
      if (bestMatched === 0) bestPhase = phase;
      break;
    }
  }

  const nextClass =
    newestPatIdx >= 0 ? pattern[(newestPatIdx + 1) % n]! : pattern[0]!;

  return { nextClass, matchedLength: bestMatched, phase: bestPhase, newestPatIdx };
}

export function parseRegisteredPatterns(codeStats: CodeValueStatRow[]): RegisteredPattern[] {
  const patterns: RegisteredPattern[] = [];

  for (const row of codeStats) {
    if (row.matchKind === 'sequence') {
      const sequence = parseRunClassSequence(row.description);
      if (sequence && sequence.length > 0) {
        patterns.push({
          kind: 'sequence',
          code: row.code,
          description: row.description,
          sequence,
        });
      }
      continue;
    }

    if (row.matchKind === 'pattern') {
      const sideRef = resolvePatternFieldFromDescription(row.description, row.type);
      if (sideRef) {
        patterns.push({
          kind: 'side',
          code: row.code,
          description: row.description,
          sideRef,
        });
      }
    }
  }

  return patterns;
}

/** 시퀀스 패턴 정렬 강도 (0~1) — Master 출현 빈도 미사용 */
function sequenceAlignmentScore(
  digitClasses: DigitClass[],
  sequence: DigitClass[],
  phase: PatternPhaseState,
): number {
  if (sequence.length === 0) return 0;
  const suffixScore = phase.matchedLength / Math.min(digitClasses.length, sequence.length);
  const phaseScore = phase.newestPatIdx >= 0 ? 1 : 0.35;
  return Math.min(1, suffixScore * 0.65 + phaseScore * 0.35);
}

/** index 가 run 패턴(1 중복, 3 이상 등) 경계에 있는지 */
function isAtSidePatternBoundary(
  analysis: AnalysisResult,
  digitIndex: number,
  sideRef: SidePatternRef,
): boolean {
  const indices = collectPatternMatchStartIndices(analysis, sideRef.side, sideRef.field);
  if (indices.length === 0) return false;

  for (const start of indices) {
    const run = analysis.runs.find((r) => r.startIndex === start && r.cls === sideRef.side);
    if (!run) continue;
    const endIndex = run.endIndex - 1;
    if (digitIndex === endIndex || digitIndex === endIndex + 1) return true;
  }
  return false;
}

export interface PatternContextSnapshot {
  digitIndex: number;
  digitPrefix: string;
  classes: DigitClass[];
  sequencePhases: Map<string, PatternPhaseState>;
  activeSidePatterns: Set<string>;
}

function buildContextSnapshot(
  analysis: AnalysisResult,
  digitIndex: number,
  patterns: RegisteredPattern[],
): PatternContextSnapshot {
  const digitPrefix = analysis.digits.slice(0, digitIndex + 1);
  const classes = toClassSequence(digitPrefix);
  const sequencePhases = new Map<string, PatternPhaseState>();
  const activeSidePatterns = new Set<string>();

  for (const pat of patterns) {
    if (pat.kind === 'sequence') {
      sequencePhases.set(pat.code, predictNextClassFromDigitPattern(classes, pat.sequence));
    } else if (isAtSidePatternBoundary(analysis, digitIndex, pat.sideRef)) {
      activeSidePatterns.add(pat.code);
    }
  }

  return {
    digitIndex,
    digitPrefix,
    classes,
    sequencePhases,
    activeSidePatterns,
  };
}

function contextSimilarity(
  live: PatternContextSnapshot,
  hist: PatternContextSnapshot,
  patterns: RegisteredPattern[],
): number {
  if (live.classes.length === 0 || hist.classes.length === 0) return 0;

  let total = 0;
  let matched = 0;

  for (const pat of patterns) {
    if (pat.kind === 'sequence') {
      const livePhase = live.sequencePhases.get(pat.code);
      const histPhase = hist.sequencePhases.get(pat.code);
      if (!livePhase || !histPhase) continue;

      total += 1;
      if (livePhase.phase !== histPhase.phase) continue;
      if (livePhase.nextClass !== histPhase.nextClass) continue;
      if (livePhase.matchedLength !== histPhase.matchedLength) continue;
      matched += 1;
      continue;
    }

    total += 1;
    const liveActive = live.activeSidePatterns.has(pat.code);
    const histActive = hist.activeSidePatterns.has(pat.code);
    if (liveActive === histActive) matched += 1;
  }

  if (total === 0) return 0;
  return matched / total;
}

interface TransitionSample {
  nextDigit: number;
  nextClass: DigitClass;
  weight: number;
}

/** Master 각 위치에서 동일 패턴 문맥 → 다음 digit/class (조건부 전환) */
function collectPatternTransitionSamples(
  analysis: AnalysisResult,
  patterns: RegisteredPattern[],
  live: PatternContextSnapshot,
  minSimilarity = 0.85,
): TransitionSample[] {
  const samples: TransitionSample[] = [];
  const master = analysis.digits;

  for (let i = 0; i < master.length - 1; i += 1) {
    const hist = buildContextSnapshot(analysis, i, patterns);
    const sim = contextSimilarity(live, hist, patterns);
    if (sim < minSimilarity) continue;

    const nextDigit = Number(master[i + 1]);
    if (!Number.isInteger(nextDigit) || nextDigit < 0 || nextDigit > 9) continue;
    const nextClass = nextDigit <= 4 ? 'low' : 'high';

    let weight = sim;
    for (const pat of patterns) {
      if (pat.kind !== 'sequence') continue;
      const phase = hist.sequencePhases.get(pat.code);
      if (!phase) continue;
      weight *= 0.5 + sequenceAlignmentScore(hist.classes, pat.sequence, phase) * 0.5;
    }

    samples.push({ nextDigit, nextClass, weight });
  }

  return samples;
}

/** prefix 숫자 완전 일치 → 다음 digit (패턴 시점 일치) */
function collectExactPrefixTransitions(
  masterDigits: string,
  prefix: string,
): TransitionSample[] {
  if (!prefix) return [];
  const samples: TransitionSample[] = [];
  const limit = masterDigits.length - prefix.length;

  for (let i = 0; i < limit; i += 1) {
    if (masterDigits.slice(i, i + prefix.length) !== prefix) continue;
    const nextDigit = Number(masterDigits[i + prefix.length]);
    if (!Number.isInteger(nextDigit) || nextDigit < 0 || nextDigit > 9) continue;
    samples.push({
      nextDigit,
      nextClass: nextDigit <= 4 ? 'low' : 'high',
      weight: 1,
    });
  }

  return samples;
}

function aggregateClassTransitions(samples: TransitionSample[]): Map<DigitClass, number> {
  const weights = new Map<DigitClass, number>();
  for (const s of samples) {
    weights.set(s.nextClass, (weights.get(s.nextClass) ?? 0) + s.weight);
  }
  return weights;
}

function aggregateDigitTransitions(
  samples: TransitionSample[],
  targetClass: DigitClass,
): Map<number, number> {
  const weights = new Map<number, number>();
  for (const s of samples) {
    if (!isDigitInClass(s.nextDigit, targetClass)) continue;
    weights.set(s.nextDigit, (weights.get(s.nextDigit) ?? 0) + s.weight);
  }
  return weights;
}

function sumMap(values: Map<unknown, number>): number {
  let sum = 0;
  for (const v of values.values()) sum += v;
  return sum;
}

function pickBestClass(weights: Map<DigitClass, number>): {
  cls: DigitClass;
  prob: number;
} {
  const low = weights.get('low') ?? 0;
  const high = weights.get('high') ?? 0;
  const total = low + high;
  if (total <= 0) return { cls: 'low', prob: 0 };
  if (low >= high) return { cls: 'low', prob: low / total };
  return { cls: 'high', prob: high / total };
}

export function findBestPatternCodeMatch(
  digitClasses: DigitClass[],
  codeStats: CodeValueStatRow[],
): PatternCodeMatch | null {
  if (digitClasses.length === 0) return null;

  let best: PatternCodeMatch | null = null;

  for (const row of codeStats) {
    if (row.matchKind !== 'sequence') continue;
    const sequence = parseRunClassSequence(row.description);
    if (!sequence || sequence.length === 0) continue;

    const phase = predictNextClassFromDigitPattern(digitClasses, sequence);
    const weight = sequenceAlignmentScore(digitClasses, sequence, phase);
    if (weight <= 0) continue;

    if (!best || weight > best.weight) {
      best = {
        code: row.code,
        description: row.description,
        sequence,
        weight,
        matchedLength: phase.matchedLength,
        phase: phase.phase,
      };
    }
  }

  return best;
}

export function classifyMasterCodeProfile(
  result: AnalysisResult,
  codeStats: CodeValueStatRow[],
  prefix = '',
): MasterCodeProfile {
  const digitClasses = getLiveDigitClasses(prefix, result.digits);
  const activePatterns = parseRegisteredPatterns(codeStats);
  const patternMatch = findBestPatternCodeMatch(digitClasses, codeStats);
  const firstPattern = activePatterns[0] ?? null;

  return {
    topCode: patternMatch?.code ?? firstPattern?.code ?? null,
    topDescription: patternMatch?.description ?? firstPattern?.description ?? '',
    topSequence:
      patternMatch?.sequence ??
      (firstPattern?.kind === 'sequence' ? firstPattern.sequence : null),
    patternMatch,
    activePatterns,
  };
}

function resolveBandFromSequenceRules(
  patterns: RegisteredPattern[],
  digitClasses: DigitClass[],
): BandDecision | null {
  const sequencePatterns = patterns.filter((p) => p.kind === 'sequence');
  if (sequencePatterns.length === 0) return null;

  let totalWeight = 0;
  let lowW = 0;
  let highW = 0;
  let bestCode: string | null = null;
  let bestDesc = '';
  let bestMatched = 0;

  for (const pat of sequencePatterns) {
    if (pat.kind !== 'sequence') continue;
    const phase = predictNextClassFromDigitPattern(digitClasses, pat.sequence);
    const w = sequenceAlignmentScore(digitClasses, pat.sequence, phase);
    if (w <= 0) continue;

    totalWeight += w;
    if (phase.nextClass === 'low') lowW += w;
    else highW += w;

    if (phase.matchedLength >= bestMatched) {
      bestMatched = phase.matchedLength;
      bestCode = pat.code;
      bestDesc = pat.description;
    }
  }

  if (totalWeight <= 0) return null;

  const cls: DigitClass = lowW >= highW ? 'low' : 'high';
  const prob = (cls === 'low' ? lowW : highW) / totalWeight;

  return {
    targetBand: classToBand(cls),
    reason: 'sequenceRule',
    matchedCode: bestCode,
    matchedDescription: bestDesc,
    expectedClass: cls,
    matchedLength: bestMatched,
    transitionProb: prob,
  };
}

export function resolveTargetBandFromPattern(
  profile: MasterCodeProfile,
  prefix: string,
  masterDigits: string,
  _analysis: AnalysisResult,
  transitionSamples: TransitionSample[],
): BandDecision {
  void _analysis;
  const classWeights = aggregateClassTransitions(transitionSamples);

  if (sumMap(classWeights) > 0) {
    const { cls, prob } = pickBestClass(classWeights);
    const topPattern = profile.patternMatch;
    return {
      targetBand: classToBand(cls),
      reason: 'patternTransition',
      matchedCode: topPattern?.code ?? profile.topCode,
      matchedDescription: topPattern?.description ?? profile.topDescription,
      expectedClass: cls,
      matchedLength: topPattern?.matchedLength ?? 0,
      transitionProb: prob,
    };
  }

  const digitClasses = getLiveDigitClasses(prefix, masterDigits);
  const fromRules = resolveBandFromSequenceRules(profile.activePatterns, digitClasses);
  if (fromRules) return fromRules;

  const tail = digitClasses[digitClasses.length - 1];
  if (tail) {
    const opposite: DigitClass = tail === 'low' ? 'high' : 'low';
    return {
      targetBand: classToBand(opposite),
      reason: 'runTiming',
      matchedCode: profile.topCode,
      matchedDescription: profile.topDescription,
      expectedClass: opposite,
      matchedLength: digitClasses.length,
      transitionProb: 0,
    };
  }

  const fallback = getDigitBand(Number(prefix.slice(-1) || masterDigits.slice(-1))) ?? 'low';
  return {
    targetBand: fallback,
    reason: 'fallback',
    matchedCode: profile.topCode,
    matchedDescription: profile.topDescription,
    expectedClass: fallback,
    matchedLength: 0,
    transitionProb: 0,
  };
}

export function collectDigitsAtPatternPhase(
  masterDigits: string,
  prefix: string,
  pattern: PatternCodeMatch,
  expectedClass: DigitClass,
): Map<number, number> {
  const analysis = analyzeMasterValue('', masterDigits);
  const patterns: RegisteredPattern[] = [
    {
      kind: 'sequence',
      code: pattern.code,
      description: pattern.description,
      sequence: pattern.sequence,
    },
  ];
  const liveIdx = prefix.length > 0 ? prefix.length - 1 : masterDigits.length - 1;
  const live = buildContextSnapshot(analysis, Math.max(0, liveIdx), patterns);
  const samples = collectPatternTransitionSamples(analysis, patterns, live, 0.75);
  return aggregateDigitTransitions(samples, expectedClass);
}

function weightsToRankedDigits(
  weights: Map<number, number>,
  targetBand: DigitBand,
): RankedDigit[] {
  const pool = targetBand === 'low' ? [0, 1, 2, 3, 4] : [5, 6, 7, 8, 9];
  const total = sumMap(weights);

  const ranked = pool
    .map((digit) => {
      const score = weights.get(digit) ?? 0;
      return {
        digit,
        score,
        probability: total > 0 ? score / total : 0,
      };
    })
    .filter((row) => row.score > 0);

  if (ranked.length === 0) {
    return pool.map((digit) => ({ digit, score: 0, probability: 0 }));
  }

  ranked.sort((a, b) => b.score - a.score || a.digit - b.digit);
  return ranked;
}

export function predictFromCodePatternProfile(
  result: AnalysisResult,
  codeStats: CodeValueStatRow[],
  prefix: string,
  lastDigit: number,
): CodePatternPrediction {
  void lastDigit;
  const profile = classifyMasterCodeProfile(result, codeStats, prefix);
  const patterns = profile.activePatterns;

  const liveIdx =
    prefix.length > 0 ? prefix.length - 1 : Math.max(0, result.digits.length - 1);
  const live = buildContextSnapshot(result, liveIdx, patterns);

  let samples = collectPatternTransitionSamples(result, patterns, live);
  samples = [...samples, ...collectExactPrefixTransitions(result.digits, prefix)];

  const bandDecision = resolveTargetBandFromPattern(
    profile,
    prefix,
    result.digits,
    result,
    samples,
  );

  const digitWeights = aggregateDigitTransitions(samples, bandDecision.expectedClass);
  const rankedDigits = weightsToRankedDigits(digitWeights, bandDecision.targetBand);
  const totalSignal = rankedDigits.reduce((sum, row) => sum + row.score, 0);

  return {
    profile,
    bandDecision,
    targetBand: bandDecision.targetBand,
    rankedDigits,
    totalSignal,
    sampleCount: samples.length,
    contextMatches: samples.length,
  };
}

export function getPatternBandLabel(decision: BandDecision): string {
  const band = decision.targetBand === 'low' ? '저점' : '고점';
  const prob =
    decision.transitionProb > 0
      ? ` ${Math.round(decision.transitionProb * 100)}%`
      : '';
  switch (decision.reason) {
    case 'patternTransition':
      return `패턴 전환${prob} → ${band}`;
    case 'sequenceRule':
      return `패턴 ${decision.matchedDescription} → ${band}`;
    case 'runTiming':
      return `run 시점 → ${band}`;
    case 'fallback':
      return `기본 → ${band}`;
  }
}

export function resolveTargetBandFromCodeProfile(
  profile: MasterCodeProfile,
  lastDigit: number,
  masterDigits: string,
  prefix = '',
): BandDecision {
  void lastDigit;
  const analysis = analyzeMasterValue('', masterDigits);
  const patterns = profile.activePatterns;
  const liveIdx =
    prefix.length > 0 ? prefix.length - 1 : Math.max(0, masterDigits.length - 1);
  const live = buildContextSnapshot(analysis, liveIdx, patterns);
  const samples = collectPatternTransitionSamples(analysis, patterns, live);
  return resolveTargetBandFromPattern(
    profile,
    prefix,
    masterDigits,
    analysis,
    samples,
  );
}

export function getBandDecisionLabel(decision: BandDecision): string {
  return getPatternBandLabel(decision);
}

export function getMasterPatternModeLabel(profile: MasterCodeProfile): string {
  if (profile.patternMatch?.description) {
    return `패턴 ${profile.patternMatch.description}`;
  }
  if (profile.activePatterns.length > 1) {
    return `복합 패턴 ${profile.activePatterns.length}종`;
  }
  return profile.topDescription || '패턴 미확인';
}

export function buildContextRuns(prefix: string, masterDigits: string): never[] {
  void prefix;
  void masterDigits;
  return [];
}

export function predictNextRunClassFromSequence(
  runClasses: DigitClass[],
  sequence: DigitClass[],
): { nextClass: DigitClass; matchedRunCount: number; phaseStart: number } {
  const phase = predictNextClassFromDigitPattern(runClasses, sequence);
  return {
    nextClass: phase.nextClass,
    matchedRunCount: phase.matchedLength,
    phaseStart: phase.phase,
  };
}

export function scoresToRankedDigits(
  scores: Map<number, number>,
  targetBand: DigitBand,
): { digit: number; score: number }[] {
  return weightsToRankedDigits(scores, targetBand).map(({ digit, score }) => ({
    digit,
    score,
  }));
}
