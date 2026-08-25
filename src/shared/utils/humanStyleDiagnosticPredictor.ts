/**
 * Human-style hierarchical diagnostic predictor — NOT Production V1.
 *
 * Replays analyst workflow: STEP1 MainBand → STEP2 SubBand → STEP3 Master digit,
 * with recursive 10-pattern drill-down at each layer.
 *
 * Does NOT call computeDigitPredictionScores or Production ranking.
 */

import type { AnalysisResult, DigitClass } from './analysisEngine';
import { analyzeMasterValue, buildRuns, toClassSequence } from './analysisEngine';
import {
  extractCodeValuesFromBaseSequence,
  type CodeValueSubPatterns,
} from './codeValueSubAnalysis';
import {
  buildLegacyCodeContentRow,
  type LegacyCodeContentRow,
} from './legacyCodeContentEngine';
import {
  buildPointValueTokens,
  filterPointValuesToSubBand,
  getSidePointValues,
} from './pointValuesCodeFlow';
import {
  getDigitSubBand,
  getDigitsInSubBand,
  getMainBandLabel,
  getSubBandLabel,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';
import {
  findLastDigitInMainBand,
  findLastDigitInSubBand,
  inferMainBandPhaseFromSequence,
  inferPhaseFromSequence,
  inferSubBandPhaseFromOneBetween,
  virtualMasterDigits,
} from './subBandRepeatJudgment';

/** First diagnostic fixture — long Master ending in digit 0 */
export const HUMAN_DIAGNOSTIC_FIXTURE_MASTER =
  '9646451235006779898914209859151427160757974447028108582081949166983937425898964455403191405999772414950682346446970164689087486158643252834164691178376495108197906078600324795091954706151130973272056542469455521015656769284987045360138864695367381802706885862090417492076474038856206750398017436130085556428133127699360758808240968391228512807224244049566053394442644325605412704729739539543161240734544550544004485955093884786990620752203949703845231211420169221541826648618264601754370511694133468612764194932863418319300691686533249393815704180177731483393205855416379028449301764528291796498736475078071384034600974660534236618048022524696120343753342211159891428168088246272676859370916618586940505652302359856362854422933691195361781873175185600652287713791716510564162601961988572935797825516720805844788550718962281291943809116739216218454387116001842928529254901755008349411600466845711739664278210457455698714508283704651927633595544284222149592750891543708739110383708546046265340973771360';

export const HUMAN_FIXTURE_EXPECTED = {
  step1: 'LOW' as const,
  step2: 'LOW_LOW' as const,
  step3: 0,
  final: 0,
};

export type PatternField = keyof CodeValueSubPatterns;
export type DiagnosticPhase = 'repeat' | 'transition';

export interface TailFlowAssessment {
  phase: DiagnosticPhase;
  label: string;
  repeatWeight: number;
  transitionWeight: number;
}

export interface PatternLayerTrace {
  depth: number;
  sequenceLabel: string;
  sequence: readonly number[];
  patternSummary: Partial<Record<PatternField, number[]>>;
  selectedDrillDown: PatternField | null;
  drillDownReason: string;
  child: PatternLayerTrace | null;
  tailFlow: TailFlowAssessment | null;
}

export interface StepCandidateTrace {
  id: string;
  label: string;
  recursivePath: PatternLayerTrace;
  predictedFlow: DiagnosticPhase;
  reason: string;
  /** Counterfactual note when simulating branch assumption */
  counterfactual?: string;
}

export interface DiagnosticStepResult {
  step: 1 | 2 | 3;
  title: string;
  currentBranch: string;
  candidates: StepCandidateTrace[];
  winnerId: string;
  winnerLabel: string;
}

export interface HumanStyleDiagnosticResult {
  masterTailDigit: number;
  masterLength: number;
  step1: DiagnosticStepResult;
  step2: DiagnosticStepResult | null;
  step3: DiagnosticStepResult | null;
  finalDigit: number | null;
  matchesHumanFixture: boolean;
  firstDivergence: 'STEP1' | 'STEP2' | 'STEP3' | null;
  divergenceReason: string | null;
}

const MAX_RECURSION_DEPTH = 4;

const DRILL_DOWN_PRIORITY: PatternField[] = [
  'oneBetween',
  'oneDuplicate',
  'commaAlpha_2_3',
  'plusAlpha_3_2',
];

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

function expectedRunFromTailHints(runHints: readonly number[], fallbackRun: number): number {
  const tailHints = runHints.slice(-3);
  if (tailHints.length > 0) {
    return Math.round(tailHints.reduce((a, b) => a + b, 0) / tailHints.length);
  }
  return Math.max(fallbackRun, 1);
}

/** Extract child sequence for recursive 10-pattern re-analysis. */
export function extractDrillDownSequence(
  sequence: readonly number[],
  field: PatternField,
): number[] {
  const patterns = extractCodeValuesFromBaseSequence([...sequence]);
  const values = patterns[field] ?? [];
  if (values.length > 0) return [...values];

  if (field === 'oneBetween') {
    const markers = sequence
      .map((v, i) => (v === 1 ? i : -1))
      .filter((i) => i >= 0);
    if (markers.length >= 2) {
      const betweenCounts: number[] = [];
      for (let m = 0; m < markers.length - 1; m += 1) {
        betweenCounts.push(markers[m + 1]! - markers[m]! - 1);
      }
      return betweenCounts.filter((c) => c > 0);
    }
  }

  return [];
}

function summarizePatterns(patterns: CodeValueSubPatterns): Partial<Record<PatternField, number[]>> {
  const out: Partial<Record<PatternField, number[]>> = {};
  for (const key of Object.keys(patterns) as PatternField[]) {
    const vals = patterns[key];
    if (vals.length > 0) out[key] = vals;
  }
  return out;
}

function selectDrillDownField(
  patterns: CodeValueSubPatterns,
  sequence: readonly number[],
): { field: PatternField | null; reason: string } {
  for (const field of DRILL_DOWN_PRIORITY) {
    const vals = patterns[field] ?? [];
    if (vals.length > 0) {
      return {
        field,
        reason: `${field} 값 [${vals.join(',')}] → 하위 sequence 재분석`,
      };
    }
    const extracted = extractDrillDownSequence(sequence, field);
    if (extracted.length > 0) {
      return {
        field,
        reason: `${field} segment 추출 [${extracted.join(',')}] → 재분석`,
      };
    }
  }
  return { field: null, reason: 'drill-down 패턴 없음 — tail flow 판단' };
}

/** Assess tail continuation vs termination from pattern flow (no frequency ranking). */
export function assessTailFlow(
  sequence: readonly number[],
  side: DigitClass,
  currentSub: DigitSubBand,
  liveRunLength: number,
): TailFlowAssessment {
  let repeatWeight = 0;
  let transitionWeight = 0;
  const parts: string[] = [];

  const oneBetween = inferSubBandPhaseFromOneBetween([...sequence], side, currentSub);
  if (oneBetween) {
    const w = 3;
    if (oneBetween.phase === 'repeat') repeatWeight += w;
    else transitionWeight += w;
    parts.push(`1사이(×${w}): ${oneBetween.label}`);
  }

  const patterns = extractCodeValuesFromBaseSequence([...sequence], side);
  const trailingRun = trailingValueRun(sequence);
  const runHints = [
    ...(patterns.oneDuplicate ?? []),
    ...(patterns.threeOrMore ?? []),
    ...(patterns.fiveOrMore ?? []),
  ].filter((v) => v > 0);
  const expectedRun = expectedRunFromTailHints(runHints, liveRunLength || trailingRun);

  if (liveRunLength > 0 && liveRunLength < expectedRun) {
    repeatWeight += 1;
    parts.push(`run(×1): 진행 ${liveRunLength}/${expectedRun} — 아직 ${expectedRun}까지 확장 가능`);
  } else if (liveRunLength >= expectedRun && expectedRun > 0) {
    transitionWeight += 1;
    parts.push(`run(×1): 종료 ${liveRunLength}≥${expectedRun} — ${expectedRun}에서 종료가 자연스러움`);
  } else if (trailingRun > 0 && trailingRun < expectedRun) {
    repeatWeight += 1;
    parts.push(`S tail run(×1): ${trailingRun}/${expectedRun}`);
  } else if (trailingRun >= expectedRun && expectedRun > 0) {
    transitionWeight += 1;
    parts.push(`S tail run(×1): 종료 ${trailingRun}≥${expectedRun}`);
  }

  if ((patterns.oneDuplicate?.length ?? 0) > 0) {
    const dupTail = patterns.oneDuplicate!.at(-1)!;
    if (liveRunLength <= 1 || trailingRun <= 1) {
      repeatWeight += 2;
      parts.push(`1중복(×2): hint ${dupTail} — run 유지`);
    } else if (liveRunLength >= dupTail || trailingRun >= dupTail) {
      transitionWeight += 2;
      parts.push(`1중복(×2): hint ${dupTail} — ${dupTail}에서 종료 후 전환`);
    }
  }

  if (repeatWeight === 0 && transitionWeight === 0) {
    transitionWeight = 1;
    parts.push('종합: 명확한 지속 신호 없음 → 전환 검토');
  }

  const phase: DiagnosticPhase =
    repeatWeight > transitionWeight ? 'repeat' : 'transition';
  return {
    phase,
    label: parts.join(' | '),
    repeatWeight,
    transitionWeight,
  };
}

function getPatternLayerLeaf(path: PatternLayerTrace): PatternLayerTrace {
  return path.child ? getPatternLayerLeaf(path.child) : path;
}

/** Layer with strongest 1중복 tail hint — matches human focus on e.g. hint 5 → end at 4. */
function findOneDuplicateFocusLayer(path: PatternLayerTrace): PatternLayerTrace | null {
  let best: PatternLayerTrace | null = null;
  let bestHint = -1;
  const walk = (node: PatternLayerTrace): void => {
    const hints = node.patternSummary.oneDuplicate;
    if (hints && hints.length > 0) {
      const lastHint = hints[hints.length - 1]!;
      if (lastHint > bestHint) {
        bestHint = lastHint;
        best = node;
      }
    }
    if (node.child) walk(node.child);
  };
  walk(path);
  return best;
}

/**
 * Human-style phase from recursive path — prioritises nested 1중복 termination
 * (e.g. hint 5 → natural end at 4 → parent band/segment repeat) over flat 1사이 marker.
 */
export function resolveHierarchicalPhaseFromPath(
  path: PatternLayerTrace,
  liveRunLength: number,
  side: DigitClass,
  currentSub: DigitSubBand,
): { phase: DiagnosticPhase; reason: string; source: string } {
  const focusLayer = findOneDuplicateFocusLayer(path);
  if (focusLayer) {
    const hints = focusLayer.patternSummary.oneDuplicate!;
    const expectedHint = hints[hints.length - 1]!;
    const seqTrailing = trailingValueRun(focusLayer.sequence);
    const activeRun = Math.max(liveRunLength, seqTrailing);

    // At or just below hint N: natural termination at N-1 → repeat parent (human 5→4 rule).
    if (activeRun <= expectedHint) {
      return {
        phase: 'repeat',
        source: `${focusLayer.sequenceLabel} · 1중복`,
        reason: `1중복 hint ${expectedHint} — run ${activeRun}, ${expectedHint - 1}~${expectedHint} 구간 종료 → 유지`,
      };
    }
    return {
      phase: 'transition',
      source: `${focusLayer.sequenceLabel} · 1중복`,
      reason: `1중복 hint ${expectedHint} — run ${activeRun}>${expectedHint} → 전환`,
    };
  }

  const leaf = getPatternLayerLeaf(path);
  const tail = leaf.tailFlow ?? assessTailFlow(leaf.sequence, side, currentSub, liveRunLength);
  return {
    phase: tail.phase,
    source: leaf.sequenceLabel,
    reason: tail.label,
  };
}

/**
 * Recursive 10-pattern layer analysis — traceable drill-down path.
 */
export function analyzeRecursivePatternFlow(options: {
  sequence: readonly number[];
  sequenceLabel: string;
  side: DigitClass;
  currentSub: DigitSubBand;
  liveRunLength: number;
  depth?: number;
  maxDepth?: number;
}): PatternLayerTrace {
  const depth = options.depth ?? 0;
  const maxDepth = options.maxDepth ?? MAX_RECURSION_DEPTH;
  const sequence = [...options.sequence];
  const patterns = extractCodeValuesFromBaseSequence(sequence, options.side);
  const { field, reason } = selectDrillDownField(patterns, sequence);

  if (field && depth < maxDepth) {
    const childSeq =
      (patterns[field]?.length ?? 0) > 0
        ? [...patterns[field]!]
        : extractDrillDownSequence(sequence, field);
    if (childSeq.length > 0) {
      return {
        depth,
        sequenceLabel: options.sequenceLabel,
        sequence,
        patternSummary: summarizePatterns(patterns),
        selectedDrillDown: field,
        drillDownReason: reason,
        child: analyzeRecursivePatternFlow({
          sequence: childSeq,
          sequenceLabel: `${options.sequenceLabel} → ${field}`,
          side: options.side,
          currentSub: options.currentSub,
          liveRunLength: trailingValueRun(childSeq),
          depth: depth + 1,
          maxDepth,
        }),
        tailFlow: null,
      };
    }
  }

  return {
    depth,
    sequenceLabel: options.sequenceLabel,
    sequence,
    patternSummary: summarizePatterns(patterns),
    selectedDrillDown: null,
    drillDownReason: reason,
    child: null,
    tailFlow: assessTailFlow(sequence, options.side, options.currentSub, options.liveRunLength),
  };
}

function liveRunAtTail(context: string): { side: DigitClass; length: number } {
  const runs = buildRuns(toClassSequence(context));
  if (runs.length === 0) {
    const tail = Number(context.at(-1));
    const sub = getDigitSubBand(tail);
    const side: DigitClass = sub && (sub === 'lowLow' || sub === 'lowHigh') ? 'low' : 'high';
    return { side, length: 1 };
  }
  const last = runs[runs.length - 1]!;
  return { side: last.cls, length: last.length };
}

function buildStep1(result: AnalysisResult): DiagnosticStepResult {
  const context = result.digits;
  const live = liveRunAtTail(context);
  const lastDigit = Number(context.at(-1));

  const lowS = result.lowRunLengths;
  const highS = result.highRunLengths;
  const lowLiveRun = live.side === 'low' ? live.length : 1;
  const highLiveRun = live.side === 'high' ? live.length : 1;

  const lowPath = analyzeRecursivePatternFlow({
    sequence: lowS,
    sequenceLabel: 'S (저점 run lengths)',
    side: 'low',
    currentSub: 'lowLow',
    liveRunLength: lowLiveRun,
  });

  const highPath = analyzeRecursivePatternFlow({
    sequence: highS,
    sequenceLabel: 'S (고점 run lengths)',
    side: 'high',
    currentSub: 'highHigh',
    liveRunLength: highLiveRun,
  });

  const lowHierarchy = resolveHierarchicalPhaseFromPath(
    lowPath,
    lowLiveRun,
    'low',
    'lowLow',
  );
  const highHierarchy = resolveHierarchicalPhaseFromPath(
    highPath,
    highLiveRun,
    'high',
    'highHigh',
  );

  const productionLowRef = inferMainBandPhaseFromSequence(
    lowS,
    'low',
    lowLiveRun,
    lastDigit,
  );

  const lowCandidate: StepCandidateTrace = {
    id: 'LOW',
    label: '저점 [0~4]',
    recursivePath: lowPath,
    predictedFlow: lowHierarchy.phase,
    reason: `[hierarchical] ${lowHierarchy.source}: ${lowHierarchy.reason} (Production ref: ${productionLowRef.phase})`,
    counterfactual:
      '다음 Master digit가 저점(0~4)이라 가정 → nested 1중복 tail이 repeat이면 저점 한 번 더',
  };

  const highCandidate: StepCandidateTrace = {
    id: 'HIGH',
    label: '고점 [5~9]',
    recursivePath: highPath,
    predictedFlow: highHierarchy.phase,
    reason:
      live.side === 'low'
        ? `[counterfactual] 저점 S hierarchical=${lowHierarchy.phase} → ${lowHierarchy.phase === 'transition' ? '고점 전환' : '고점 비자연'}`
        : `[hierarchical] ${highHierarchy.source}: ${highHierarchy.reason}`,
    counterfactual:
      '다음 Master digit가 고점(5~9)이라 가정 → 저점 S transition 또는 고점 S repeat',
  };

  let winnerId: 'LOW' | 'HIGH' = 'LOW';
  if (live.side === 'low') {
    winnerId = lowHierarchy.phase === 'repeat' ? 'LOW' : 'HIGH';
  } else {
    winnerId = highHierarchy.phase === 'repeat' ? 'HIGH' : 'LOW';
  }

  return {
    step: 1,
    title: 'STEP1 — 저점 / 고점',
    currentBranch: `Master tail digit ${lastDigit} (${live.side} run ×${live.length})`,
    candidates: [lowCandidate, highCandidate],
    winnerId,
    winnerLabel: winnerId === 'LOW' ? '저점 [0~4]' : '고점 [5~9]',
  };
}

function buildStep2(result: AnalysisResult, mainBand: DigitBand): DiagnosticStepResult {
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const context = virtualMasterDigits(result, '');
  const lastDigit = findLastDigitInMainBand(context, mainBand) ?? Number(context.at(-1));
  const currentSub = getDigitSubBand(lastDigit)!;
  const sideS = mainBand === 'low' ? result.lowRunLengths : result.highRunLengths;

  const subCandidates: Array<{ id: string; sub: DigitSubBand; label: string }> =
    mainBand === 'low'
      ? [
          { id: 'LOW_LOW', sub: 'lowLow', label: '저점의 저점 [0,1]' },
          { id: 'LOW_HIGH', sub: 'lowHigh', label: '저점의 고점 [2,3,4]' },
        ]
      : [
          { id: 'HIGH_LOW', sub: 'highLow', label: '고점의 저점 [5,7]' },
          { id: 'HIGH_HIGH', sub: 'highHigh', label: '고점의 고점 [8,9]' },
        ];

  const traces: StepCandidateTrace[] = subCandidates.map(({ id, sub, label }) => {
    const filtered = filterPointValuesToSubBand(getSidePointValues(result, '', side), sub);
    const sPrime = buildPointValueTokens(filtered).map((t) => t.value);
    const isCurrent = sub === currentSub;
    const path = analyzeRecursivePatternFlow({
      sequence: sPrime,
      sequenceLabel: `S′ ${getSubBandLabel(sub)}`,
      side,
      currentSub: sub,
      liveRunLength: isCurrent ? trailingValueRun(sPrime) || 1 : 1,
    });
    const hierarchy = resolveHierarchicalPhaseFromPath(
      path,
      isCurrent ? trailingValueRun(sPrime) || 1 : 1,
      side,
      sub,
    );
    const productionRef = inferPhaseFromSequence(sPrime, side, sub, lastDigit, {
      sideSRunFallback: sideS,
    });
    return {
      id,
      label,
      recursivePath: path,
      predictedFlow: hierarchy.phase,
      reason: `[hierarchical] ${hierarchy.reason} (Production ref: ${productionRef.phase})`,
    };
  });

  const currentCandidate = traces.find((t) => subCandidates.find((s) => s.id === t.id)!.sub === currentSub)!;
  let winnerId = currentCandidate.id;
  if (currentCandidate.predictedFlow === 'transition') {
    const sibling = traces.find((t) => subCandidates.find((s) => s.id === t.id)!.sub !== currentSub);
    if (sibling) winnerId = sibling.id;
  }

  return {
    step: 2,
    title: 'STEP2 — 세부구간',
    currentBranch: `${getMainBandLabel(mainBand)} · 현재 ${getSubBandLabel(currentSub)} [digit ${lastDigit}]`,
    candidates: traces,
    winnerId,
    winnerLabel: subCandidates.find((s) => s.id === winnerId)!.label,
  };
}

function buildLegacy01Row(result: AnalysisResult): LegacyCodeContentRow {
  const pointValues = getSidePointValues(result, '', 'low');
  return buildLegacyCodeContentRow(
    pointValues,
    { id: 1, code: '01', type: '저점', description: '저점,저점' },
    'low',
  );
}

function buildStep3(result: AnalysisResult, subBand: DigitSubBand): DiagnosticStepResult {
  const digits = getDigitsInSubBand(subBand);
  const context = virtualMasterDigits(result, '');
  const lastDigit = findLastDigitInSubBand(context, subBand) ?? digits[0]!;
  const legacy01 = buildLegacy01Row(result);
  const gapSequence = legacy01.gaps;

  const gapPath = analyzeRecursivePatternFlow({
    sequence: gapSequence,
    sequenceLabel: '01 코드·내용 gaps',
    side: 'low',
    currentSub: subBand,
    liveRunLength: trailingValueRun(gapSequence) || 1,
  });
  const gapHierarchy = resolveHierarchicalPhaseFromPath(
    gapPath,
    trailingValueRun(gapSequence) || 1,
    'low',
    subBand,
  );

  const traces: StepCandidateTrace[] = digits.map((digit) => {
    const isCurrent = digit === lastDigit;
    const predictedFlow: DiagnosticPhase = isCurrent
      ? gapHierarchy.phase
      : gapHierarchy.phase === 'repeat'
        ? 'transition'
        : 'repeat';

    return {
      id: String(digit),
      label: `Master digit ${digit}`,
      recursivePath: gapPath,
      predictedFlow,
      reason: isCurrent
        ? `[hierarchical] 현재 ${lastDigit} — ${gapHierarchy.reason}`
        : `digit ${digit} 전환 가설 — gap flow ${gapHierarchy.phase}의 반대`,
    };
  });

  const winnerId =
    traces.find((t) => t.id === String(lastDigit) && t.predictedFlow === 'repeat')?.id ??
    traces.find((t) => t.predictedFlow === 'repeat')?.id ??
    String(lastDigit);

  return {
    step: 3,
    title: 'STEP3 — Master digit (0~9)',
    currentBranch: `${getSubBandLabel(subBand)} · 01 코드·내용 (${gapSequence.length} gaps) · tail ${lastDigit}`,
    candidates: traces,
    winnerId,
    winnerLabel: `Master digit ${winnerId}`,
  };
}

function resolveFirstDivergence(result: HumanStyleDiagnosticResult): {
  step: 'STEP1' | 'STEP2' | 'STEP3' | null;
  reason: string | null;
} {
  const exp = HUMAN_FIXTURE_EXPECTED;
  const s1 = result.step1.winnerId;
  if (s1 !== exp.step1) {
    return {
      step: 'STEP1',
      reason: `사람=${exp.step1}, diagnostic=${s1} — ${result.step1.candidates.find((c) => c.id === s1)?.reason ?? ''}`,
    };
  }
  if (!result.step2) return { step: null, reason: null };
  if (result.step2.winnerId !== exp.step2) {
    return {
      step: 'STEP2',
      reason: `사람=${exp.step2}, diagnostic=${result.step2.winnerId}`,
    };
  }
  if (!result.step3 || result.finalDigit !== exp.step3) {
    return {
      step: 'STEP3',
      reason: `사람=${exp.step3}, diagnostic=${result.finalDigit ?? 'null'}`,
    };
  }
  return { step: null, reason: null };
}

export function runHumanStyleDiagnostic(
  masterValue: string = HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
  masterNo = '00',
): HumanStyleDiagnosticResult {
  const result = analyzeMasterValue(masterNo, masterValue);
  const tailDigit = Number(result.digits.at(-1));

  const step1 = buildStep1(result);
  const mainBand: DigitBand = step1.winnerId === 'LOW' ? 'low' : 'high';

  let step2: DiagnosticStepResult | null = null;
  let step3: DiagnosticStepResult | null = null;
  let finalDigit: number | null = null;

  if (mainBand === 'low' || mainBand === 'high') {
    step2 = buildStep2(result, mainBand);
    const subBandMap: Record<string, DigitSubBand> = {
      LOW_LOW: 'lowLow',
      LOW_HIGH: 'lowHigh',
      HIGH_LOW: 'highLow',
      HIGH_HIGH: 'highHigh',
    };
    const subBand = subBandMap[step2.winnerId] ?? 'lowLow';
    step3 = buildStep3(result, subBand);
    finalDigit = Number(step3.winnerId);
  }

  const diagnostic: HumanStyleDiagnosticResult = {
    masterTailDigit: tailDigit,
    masterLength: result.digits.length,
    step1,
    step2,
    step3,
    finalDigit,
    matchesHumanFixture: false,
    firstDivergence: null,
    divergenceReason: null,
  };

  const div = resolveFirstDivergence(diagnostic);
  diagnostic.firstDivergence = div.step;
  diagnostic.divergenceReason = div.reason;
  diagnostic.matchesHumanFixture = div.step === null;

  return diagnostic;
}

function formatPatternLayer(layer: PatternLayerTrace, indent: string): string[] {
  const lines: string[] = [];
  const seqPreview =
    layer.sequence.length > 20
      ? `[${layer.sequence.slice(0, 20).join(',')}… +${layer.sequence.length - 20}]`
      : `[${layer.sequence.join(',')}]`;
  lines.push(`${indent}${layer.sequenceLabel} ${seqPreview}`);
  const patternKeys = Object.keys(layer.patternSummary) as PatternField[];
  if (patternKeys.length > 0) {
    lines.push(
      `${indent}  10 Pattern: ${patternKeys.map((k) => `${k}=[${layer.patternSummary[k]!.join(',')}]`).join('; ')}`,
    );
  }
  if (layer.selectedDrillDown) {
    lines.push(`${indent}  drill → ${layer.selectedDrillDown}: ${layer.drillDownReason}`);
  }
  if (layer.child) {
    lines.push(...formatPatternLayer(layer.child, indent + '  '));
  } else if (layer.tailFlow) {
    lines.push(
      `${indent}  tail flow: ${layer.tailFlow.phase} (R${layer.tailFlow.repeatWeight}/T${layer.tailFlow.transitionWeight})`,
    );
    lines.push(`${indent}  reason: ${layer.tailFlow.label}`);
  }
  return lines;
}

function formatStep(step: DiagnosticStepResult): string[] {
  const lines: string[] = [
    step.title,
    `current branch: ${step.currentBranch}`,
    '',
  ];
  for (const c of step.candidates) {
    lines.push(`candidate ${c.id} (${c.label}):`);
    if (c.counterfactual) lines.push(`  counterfactual: ${c.counterfactual}`);
    lines.push('  recursive pattern path:');
    lines.push(...formatPatternLayer(c.recursivePath, '    '));
    lines.push(`  predicted flow: ${c.predictedFlow}`);
    lines.push(`  reason: ${c.reason}`);
    lines.push('');
  }
  lines.push(`winner: ${step.winnerId} (${step.winnerLabel})`);
  return lines;
}

export function formatHumanStyleDiagnosticReport(diag: HumanStyleDiagnosticResult): string {
  const lines: string[] = [
    `Human-style diagnostic — Master ${diag.masterLength} digits, tail=${diag.masterTailDigit}`,
    '',
    ...formatStep(diag.step1),
    '',
  ];

  if (diag.step2) {
    lines.push(...formatStep(diag.step2), '');
  }
  if (diag.step3) {
    lines.push(...formatStep(diag.step3), '');
  }

  lines.push(`FINAL = ${diag.finalDigit ?? '—'}`);
  lines.push(
    `Human fixture (LOW → LOW_LOW → 0): ${diag.matchesHumanFixture ? 'MATCH' : 'MISMATCH'}`,
  );
  if (diag.firstDivergence) {
    lines.push(`First divergence: ${diag.firstDivergence} — ${diag.divergenceReason ?? ''}`);
  }
  return lines.join('\n');
}
