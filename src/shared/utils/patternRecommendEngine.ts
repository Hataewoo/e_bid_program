/**
 * 패턴 추천 엔진 — 3단계만 사용
 * ① S/Code/Values → 저점·고점
 * ② Point Values DetailGrid → 세분화(저저·저고·고저·고고)
 * ③ source digit 치환 → 추첨 digit (패턴값 gap/run 직접 사용 금지)
 */

import type { AnalysisResult, CodeValueStatRow, DigitClass } from './analysisEngine';
import { buildRuns, toClassSequence } from './analysisEngine';
import { RUN_SUFFIX_MATCH_MAX } from './recentCompare';
import { collectMainCodesForContext } from './mainBandJudgment';
import { analyzeCodeValueMainDetail, collectPrimaryRunLengths, extractCodeValuesFromBaseSequence } from './codeValueSubAnalysis';
import { getDigitBand } from './digitSubBand';
import {
  getDigitsInMainBand,
  getDigitsInSubBand,
  getMainBandLabel,
  getSubBandLabel,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';
import {
  patternFlowRankScores,
  pickDigitByPatternFlow,
  resolveMainBandFromPatternFlow,
  resolveSubBandFromPatternFlow,
} from './patternFlowPick';
import { virtualMasterDigits } from './subBandRepeatJudgment';
import { wouldFormRepetitivePattern } from './patternRepeatGuard';

export type { DigitBand, DigitSubBand } from './digitSubBand';
export {
  getDigitSubBand,
  getSubBandLabel,
  getSubBandMainBand,
  getDigitsInSubBand,
  getDigitsInMainBand,
  getMainBandLabel,
} from './digitSubBand';

export const RECOMMEND_TOP_N_DEFAULT = 4;
export const RECOMMEND_TOP_N_MIN = 1;
export const RECOMMEND_TOP_N_MAX = 10;
export const RECOMMEND_CHAIN_DEPTH_DEFAULT = 4;

export interface PatternRecommendPath {
  activeSide: DigitClass;
  targetMainBand: DigitBand;
  targetSubBand: DigitSubBand;
  candidatePool: readonly number[];
  digitScores: Record<number, number>;
  mainBandReasons: string[];
  subBandReasons: string[];
  digitReasons: string[];
  activeMainCodes: string[];
  activeSubDetailCodes: string[];
}

export interface RecommendDigitCandidate {
  digit: number;
  /** Code/Values·S″ 패턴 근거 점수 */
  patternScore: number;
  /** 반복 / 전환 / 패턴 판단 */
  pickMode: FinalDigitPickMode;
  /** 판단 근거 한 줄 */
  pickReason: string;
}

export interface RecommendStepResult {
  position: number;
  prefix: string;
  candidates: RecommendDigitCandidate[];
  hierarchy: PatternRecommendHierarchy;
}

export interface PatternRecommendHierarchy {
  targetMainBand: DigitBand;
  targetSubBand: DigitSubBand;
  allowedDigits: readonly number[];
  mainBandLabel: string;
  subBandLabel: string;
  mainBandReasons: string[];
  subBandReasons: string[];
  activeMainCodes: string[];
  activeSubDetailCodes: string[];
  digitReasons: string[];
}

export interface ParsedBidInput {
  integerPart: string | null;
  decimalPrefix: string;
  displayValue: string;
}

export interface RecommendChainResult {
  parsed: ParsedBidInput;
  nextStep: RecommendStepResult | null;
  recommendedCombo: string;
  chainSteps: RecommendStepResult[];
  pathSummary: PatternRecommendHierarchy | null;
  suggestedChain: string;
  suggestedDisplay: string;
}

export type FinalDigitPickMode = 'repeat' | 'transition' | 'pattern';

export interface FinalDigitPickResult {
  digit: number;
  mode: FinalDigitPickMode;
  reason: string;
}

function sideToBand(side: DigitClass): DigitBand {
  return side === 'low' ? 'low' : 'high';
}

function trailingRunProgress(contextDigits: string): { side: DigitClass; progress: number } | null {
  if (!contextDigits) return null;
  const classes = toClassSequence(contextDigits);
  if (classes.length === 0) return null;
  const side = classes[classes.length - 1]!;
  let progress = 1;
  for (let i = classes.length - 2; i >= 0; i -= 1) {
    if (classes[i] !== side) break;
    progress += 1;
  }
  return { side, progress };
}

function inferExpectedRunLength(result: AnalysisResult, side: DigitClass): number {
  const fullS = collectPrimaryRunLengths(result.runs, side);
  const patterns = extractCodeValuesFromBaseSequence(fullS, side);
  const hints = [
    ...patterns.oneDuplicate,
    ...patterns.threeOrMore,
    ...patterns.fiveOrMore,
  ].filter((v) => v > 0);

  if (hints.length === 0) {
    const runs = buildRuns(toClassSequence(result.digits)).filter((r) => r.cls === side);
    if (runs.length === 0) return 1;
    return runs[runs.length - 1]!.length;
  }

  return Math.round(hints.reduce((a, b) => a + b, 0) / hints.length);
}

function voteNextClassFromRunSuffix(
  result: AnalysisResult,
  prefix: string,
): { low: number; high: number; reason: string } {
  const context = prefix.length > 0 ? result.digits + prefix : result.digits;
  const liveRuns = buildRuns(toClassSequence(context));
  let low = 0;
  let high = 0;
  let matches = 0;

  const suffixLen = Math.min(RUN_SUFFIX_MATCH_MAX, liveRuns.length);
  if (suffixLen === 0) {
    return { low: 1, high: 1, reason: 'run 이력 없음 → 저·고 중립' };
  }

  const liveSuffix = liveRuns
    .slice(-suffixLen)
    .map((r) => `${r.cls}:${r.length}`)
    .join('|');
  const allRuns = buildRuns(toClassSequence(result.digits));

  for (let i = suffixLen; i < allRuns.length; i += 1) {
    const histSuffix = allRuns
      .slice(i - suffixLen, i)
      .map((r) => `${r.cls}:${r.length}`)
      .join('|');
    if (histSuffix !== liveSuffix) continue;

    const nextRun = allRuns[i];
    if (!nextRun) continue;
    matches += 1;
    if (nextRun.cls === 'low') low += 1;
    else high += 1;
  }

  if (matches === 0) {
    return { low: 1, high: 1, reason: 'run suffix 미매칭 → 저·고 중립' };
  }

  return {
    low,
    high,
    reason: `run 흐름 ${liveSuffix} → 다음 run ${matches}건`,
  };
}

/** ① 저점·고점 — 1자리: S run 흐름 / 2자리~: run suffix (점수·가점 없음) */
function resolveMainBand(
  result: AnalysisResult,
  prefix: string,
): { band: DigitBand; side: DigitClass; reasons: string[] } {
  if (prefix.length > 0) {
    return resolveMainBandFromPatternFlow(result, prefix);
  }

  const vote = voteNextClassFromRunSuffix(result, prefix);
  const reasons: string[] = [vote.reason, '① 패턴 흐름 (run suffix, 점수 합산 없음)'];
  const context = result.digits;
  const live = trailingRunProgress(context);

  if (live) {
    const expected = inferExpectedRunLength(result, live.side);
    if (live.progress < expected) {
      reasons.push(
        `${live.side === 'low' ? '저점' : '고점'} run 지속 (${live.progress}/${expected})`,
      );
      const side = live.side;
      return { band: sideToBand(side), side, reasons: [...reasons, `→ ${getMainBandLabel(sideToBand(side))}`] };
    }
    reasons.push(
      `${live.side === 'low' ? '저점' : '고점'} run 종료 (${live.progress}≥${expected}) → run suffix`,
    );
    if (vote.low !== vote.high) {
      const side: DigitClass = vote.low > vote.high ? 'low' : 'high';
      return { band: sideToBand(side), side, reasons: [...reasons, `→ ${getMainBandLabel(sideToBand(side))}`] };
    }
    const tail = Number(context[context.length - 1]);
    const band = getDigitBand(tail) ?? sideToBand(live.side);
    reasons.push(`suffix 동률 → Master 꼬리 digit ${tail}`);
    const side: DigitClass = band === 'low' ? 'low' : 'high';
    return { band, side, reasons: [...reasons, `→ ${getMainBandLabel(band)}`] };
  }

  if (vote.low !== vote.high) {
    const side: DigitClass = vote.low > vote.high ? 'low' : 'high';
    return { band: sideToBand(side), side, reasons: [...reasons, `→ ${getMainBandLabel(sideToBand(side))}`] };
  }

  const tail = Number(context[context.length - 1]);
  const band = getDigitBand(tail) ?? 'low';
  reasons.push(`동률 → Master 꼬리 digit ${tail}`);
  const side: DigitClass = band === 'low' ? 'low' : 'high';
  return { band, side, reasons: [...reasons, `→ ${getMainBandLabel(band)}`] };
}

function collectMainCodesForSide(result: AnalysisResult, side: DigitClass, prefix: string = ''): string[] {
  if (prefix.length > 0) {
    return collectMainCodesForContext(virtualMasterDigits(result, prefix), side);
  }
  const s = side === 'low' ? result.lowRunLengths : result.highRunLengths;
  return analyzeCodeValueMainDetail(s, side)
    .rows.filter((row) => row.values.length > 0)
    .map((row) => row.code);
}

function buildPatternRecommendPath(
  result: AnalysisResult,
  prefix: string,
): PatternRecommendPath {
  const virtualNote =
    prefix.length > 0
      ? [`가상 Master: 원본 ${result.digits.length}자 + append [${prefix}]`]
      : [];

  const { band: targetMainBand, side: activeSide, reasons: mainBandReasons } = resolveMainBand(
    result,
    prefix,
  );

  const { sub: targetSubBand, reasons: subBandReasons } = resolveSubBandFromPatternFlow(
    result,
    prefix,
    targetMainBand,
  );

  const pool = getDigitsInSubBand(targetSubBand);
  const digitScores = patternFlowRankScores(pool, result, prefix, targetSubBand);
  const digitReasons = [`③ S″ 토큰 꼬리 순서 (점수 합산 없음)`];

  return {
    activeSide,
    targetMainBand,
    targetSubBand,
    candidatePool: pool,
    digitScores,
    mainBandReasons: [...virtualNote, ...mainBandReasons],
    subBandReasons,
    digitReasons,
    activeMainCodes: collectMainCodesForSide(result, activeSide, prefix),
    activeSubDetailCodes: [],
  };
}

function pathToHierarchy(path: PatternRecommendPath): PatternRecommendHierarchy {
  return {
    targetMainBand: path.targetMainBand,
    targetSubBand: path.targetSubBand,
    allowedDigits: path.candidatePool,
    mainBandLabel: getMainBandLabel(path.targetMainBand),
    subBandLabel: getSubBandLabel(path.targetSubBand),
    mainBandReasons: path.mainBandReasons,
    subBandReasons: path.subBandReasons,
    activeMainCodes: path.activeMainCodes,
    activeSubDetailCodes: path.activeSubDetailCodes,
    digitReasons: path.digitReasons,
  };
}

/** ①→②→③ 전체 경로 — prefix 유무와 관계없이 Code/Values S·S″ 패턴 3단계 */
export function resolvePatternRecommendPath(
  result: AnalysisResult,
  prefix: string,
): PatternRecommendPath {
  return buildPatternRecommendPath(result, prefix);
}

export { pickDigitByPatternFlow } from './patternFlowPick';

/** prefix(입력+체인)에 이미 등장한 digit 집합 */
export function usedDigitsFromPrefix(prefix: string): ReadonlySet<number> {
  const used = new Set<number>();
  for (const ch of prefix) {
    const d = Number(ch);
    if (Number.isInteger(d) && d >= 0 && d <= 9) used.add(d);
  }
  return used;
}

/** prefix에 이미 뽑은 digit은 pool 후보에서 제외 — pool 소진 시에도 used digit 복원 금지 */
export function poolExcludingPrefixPicks(
  pool: readonly number[],
  prefix: string,
): readonly number[] {
  if (prefix.length === 0) return pool;
  const used = usedDigitsFromPrefix(prefix);
  return pool.filter((d) => !used.has(d));
}

/**
 * 세분 pool에서 used digit 제외 → 소진 시 같은 main band 미사용 digit → 그래도 없으면 0~9 미사용
 * (이미 나온 digit은 절대 복원하지 않음)
 */
export function resolveEligibleDigitPool(
  path: PatternRecommendPath,
  prefix: string,
): readonly number[] {
  const fromSubBand = poolExcludingPrefixPicks(path.candidatePool, prefix);
  if (fromSubBand.length > 0) return fromSubBand;

  const used = usedDigitsFromPrefix(prefix);
  const fromMainBand = getDigitsInMainBand(path.targetMainBand).filter((d) => !used.has(d));
  if (fromMainBand.length > 0) return fromMainBand;

  return Array.from({ length: 10 }, (_, i) => i).filter((d) => !used.has(d));
}

export function resolveFinalDigitPick(
  path: PatternRecommendPath,
  result: AnalysisResult,
  prefix: string = '',
): FinalDigitPickResult | null {
  const eligible = resolveEligibleDigitPool(path, prefix);
  if (eligible.length === 0) return null;

  const pick = pickDigitByPatternFlow(eligible, result, prefix, path.targetSubBand);
  const reason =
    eligible.length < path.candidatePool.length
      ? `${pick.reason} · pool [${path.candidatePool.join(',')}] − 이미 선택 [${prefix}]`
      : eligible.length > path.candidatePool.length || !path.candidatePool.every((d) => eligible.includes(d))
        ? `${pick.reason} · pool [${path.candidatePool.join(',')}] → 확장 [${eligible.join(',')}]`
        : pick.reason;
  return {
    digit: pick.digit,
    mode: pick.mode,
    reason,
  };
}

/** Code/Values 패턴 근거로 후보 정렬 */
function rankRecommendCandidates(
  path: PatternRecommendPath,
  prefix: string,
  primaryPick: FinalDigitPickResult,
): RecommendDigitCandidate[] {
  const eligible = resolveEligibleDigitPool(path, prefix);
  const rows: RecommendDigitCandidate[] = eligible.map((d) => ({
    digit: d,
    patternScore: path.digitScores[d] ?? 0.1,
    pickMode: d === primaryPick.digit ? primaryPick.mode : 'pattern',
    pickReason: d === primaryPick.digit ? primaryPick.reason : '',
  }));

  rows.sort((a, b) => {
    if (a.digit === primaryPick.digit && b.digit !== primaryPick.digit) return -1;
    if (b.digit === primaryPick.digit && a.digit !== primaryPick.digit) return 1;
    if (b.patternScore !== a.patternScore) return b.patternScore - a.patternScore;
    return a.digit - b.digit;
  });

  return rows;
}

export function pickTopRecommendCandidates(
  path: PatternRecommendPath,
  topN: number,
  prefix: string,
  master: string = '',
  result?: AnalysisResult,
): RecommendDigitCandidate[] {
  void master;

  const primaryPick = result
    ? resolveFinalDigitPick(path, result, prefix)
    : {
        digit: [...poolExcludingPrefixPicks(path.candidatePool, prefix)].sort(
          (a, b) => (path.digitScores[b] ?? 0) - (path.digitScores[a] ?? 0) || a - b,
        )[0]!,
        mode: 'pattern' as const,
        reason: '패턴 점수 1순위',
      };

  if (!primaryPick) return [];

  const ordered = result
    ? rankRecommendCandidates(path, prefix, primaryPick)
    : poolExcludingPrefixPicks(path.candidatePool, prefix)
        .map((d) => ({
          digit: d,
          patternScore: path.digitScores[d] ?? 0.1,
          pickMode: 'pattern' as const,
          pickReason: '',
        }))
        .sort((a, b) => b.patternScore - a.patternScore || a.digit - b.digit);

  const used = usedDigitsFromPrefix(prefix);
  const unused = ordered.filter((c) => !used.has(c.digit));
  const nonRep = unused.filter((c) => !wouldFormRepetitivePattern(prefix, c.digit));
  const list = nonRep.length > 0 ? nonRep : unused;
  return list.slice(0, Math.min(topN, list.length));
}

export function clampRecommendTopN(value: number): number {
  const n = Number.isFinite(value) ? Math.trunc(value) : RECOMMEND_TOP_N_DEFAULT;
  return Math.min(RECOMMEND_TOP_N_MAX, Math.max(RECOMMEND_TOP_N_MIN, n));
}

export function parseBidRateInput(raw: string): ParsedBidInput {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { integerPart: null, decimalPrefix: '', displayValue: '' };
  }

  const dotIndex = trimmed.indexOf('.');
  if (dotIndex >= 0) {
    const intRaw = trimmed.slice(0, dotIndex).replace(/\D/g, '');
    const decRaw = trimmed.slice(dotIndex + 1).replace(/\D/g, '');
    const integerPart = intRaw.length > 0 ? intRaw : null;
    const displayValue =
      integerPart !== null ? `${integerPart}.${decRaw}` : decRaw.length > 0 ? `xx.${decRaw}` : '';
    return { integerPart, decimalPrefix: decRaw, displayValue };
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  return {
    integerPart: null,
    decimalPrefix: digitsOnly,
    displayValue: digitsOnly,
  };
}

export function recommendNextDigitStep(
  result: AnalysisResult,
  prefix: string,
  topN: number = RECOMMEND_TOP_N_DEFAULT,
): RecommendStepResult | null {
  if (result.totalCount <= 0) return null;

  const path = resolvePatternRecommendPath(result, prefix);
  const pick = resolveFinalDigitPick(path, result, prefix);
  const hierarchy = pathToHierarchy(path);
  if (pick) {
    hierarchy.digitReasons = [...hierarchy.digitReasons, pick.reason];
  }

  const candidates = pickTopRecommendCandidates(path, topN, prefix, result.digits, result);
  if (!pick && candidates.length === 0) return null;

  return {
    position: prefix.length + 1,
    prefix,
    candidates,
    hierarchy,
  };
}

function formatDisplayValue(parsed: ParsedBidInput, decimalSuffix: string): string {
  const fullDecimal = parsed.decimalPrefix + decimalSuffix;
  if (parsed.integerPart !== null) return `${parsed.integerPart}.${fullDecimal}`;
  if (fullDecimal.length === 0) return '';
  return `xx.${fullDecimal}`;
}

export function pickChainStepDigit(
  candidates: RecommendDigitCandidate[],
  workingPrefix: string,
): RecommendDigitCandidate | null {
  const used = usedDigitsFromPrefix(workingPrefix);
  const unused = candidates.filter((c) => !used.has(c.digit));
  for (const c of unused) {
    if (!wouldFormRepetitivePattern(workingPrefix, c.digit)) return c;
  }
  return unused[0] ?? null;
}

export function recommendDigitChain(
  result: AnalysisResult,
  _codeStats: CodeValueStatRow[],
  input: string,
  options: { chainDepth?: number; topN?: number; extraSteps?: number } = {},
): RecommendChainResult {
  void _codeStats;
  // 각 step: virtualMaster = result.digits + workingPrefix 로 ①②③ 재판단.
  // result.digits 는 변경하지 않음 — chain 종료 후 prefix="" 이면 원본 Master 로 복귀.
  const chainDepth = options.chainDepth ?? RECOMMEND_CHAIN_DEPTH_DEFAULT;
  const topN = clampRecommendTopN(options.topN ?? RECOMMEND_TOP_N_DEFAULT);
  const extraSteps = options.extraSteps ?? 0;
  const parsed = parseBidRateInput(input);

  const nextStep = recommendNextDigitStep(result, parsed.decimalPrefix, topN);

  const chainSteps: RecommendStepResult[] = [];
  let workingPrefix = parsed.decimalPrefix;
  const totalSteps = chainDepth + extraSteps;

  for (let step = 0; step < totalSteps; step += 1) {
    const stepResult = recommendNextDigitStep(result, workingPrefix, topN);
    if (!stepResult || stepResult.candidates.length === 0) break;

    chainSteps.push(stepResult);
    const best = pickChainStepDigit(stepResult.candidates, workingPrefix);
    if (!best) break;
    workingPrefix += String(best.digit);
  }

  const chainSuffix = workingPrefix.slice(parsed.decimalPrefix.length);
  const recommendedCombo = chainSuffix.slice(0, chainDepth);

  return {
    parsed,
    nextStep,
    recommendedCombo,
    chainSteps,
    pathSummary: nextStep ? { ...nextStep.hierarchy } : null,
    suggestedChain: workingPrefix,
    suggestedDisplay: formatDisplayValue(parsed, chainSuffix),
  };
}

export function appendDigitToInput(currentInput: string, digit: number): string {
  const parsed = parseBidRateInput(currentInput);
  const nextDecimal = `${parsed.decimalPrefix}${digit}`;

  if (parsed.integerPart !== null) return `${parsed.integerPart}.${nextDecimal}`;
  if (currentInput.includes('.')) return `xx.${nextDecimal}`;
  return nextDecimal;
}

/** @deprecated resolvePatternRecommendPath */
export const resolvePatternRecommendationPath = resolvePatternRecommendPath;

export { trailingRunProgress };
