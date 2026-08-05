import type { AnalysisResult, ClassRun, DigitClass } from './analysisEngine';
import { buildRuns, classifyChar, toClassSequence } from './analysisEngine';
import {
  analyzeCodeValueMainDetail,
  analyzeCodeValueSubDetail,
  collectPrimaryRunLengths,
  CODE_VALUE_MAIN_RULES,
  CODE_VALUE_SUB_DETAIL_RULES,
  extractCodeValuesFromBaseSequence,
  type CodeValueSubAnalysisRow,
} from './codeValueSubAnalysis';
import {
  getDigitsInSubBand,
  getMainBandLabel,
  getSubBandLabel,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';

/**
 * 패턴 추천 경로 — 두 층으로 분리 (절대 혼동하지 않음)
 *
 * 【판단층】S + Code/Values + 1중복 세분화
 *   - 저·고 run 지속/전환, 세부 구간(저점의 저점 / 고점의 고점 등) — 흐름·횟수만
 *   - 패턴 값(1, 2, 3+α …)은 추천 숫자가 아님
 *
 * 【추천층】위 판단으로 후보 풀(5~9, 5~7, 8~9 …)만 좁힌 뒤
 *   - Master Value에 실제로 나온 숫자만 추천
 */

/** 매 자리마다 동일: 저·고 판단 → 세분화 → Master 숫자 */
export type PatternPickStage = 'full';

export const PATTERN_PICK_STAGE_FULL: PatternPickStage = 'full';

/** @deprecated main-band | sub-detail 구분 제거 — 항상 full */
export type LegacyPatternPickStage = 'main-band' | 'sub-detail' | 'full';

export interface PatternRecommendationPath {
  activeSide: DigitClass;
  targetMainBand: DigitBand;
  targetSubBand: DigitSubBand;
  stage: PatternPickStage;
  candidatePool: readonly number[];
  digitScores: Record<number, number>;
  mainBandReasons: string[];
  subBandReasons: string[];
  digitReasons: string[];
  activeMainCodes: string[];
  activeSubDetailCodes: string[];
}

const PATTERN_FIELD_WEIGHTS: Record<string, number> = {
  oneDuplicate: 1.0,
  commaAlpha_2_3: 0.85,
  plusAlpha_3_2: 0.85,
  plusAlpha_4_3: 0.8,
  plusAlpha_4_4: 0.75,
  threeOrMore: 0.7,
  fiveOrMore: 0.65,
  oneBetween: 0.8,
  alphaPlus_3_2: 0.85,
  alphaPlus_4_3: 0.85,
};

const SUB_BANDS_FOR_MAIN: Record<DigitBand, readonly DigitSubBand[]> = {
  low: ['lowLow', 'lowHigh'],
  high: ['highLow', 'highHigh'],
};

function bandToSide(band: DigitBand): DigitClass {
  return band === 'low' ? 'low' : 'high';
}

function sideToBand(side: DigitClass): DigitBand {
  return side === 'low' ? 'low' : 'high';
}

/** S/세분화 패턴 값 → 세부 구간 판단용 (추천 digit 아님) */
function patternValueToSubBandHint(value: number, mainBand: DigitBand): DigitSubBand {
  if (mainBand === 'low') {
    return value <= 1 ? 'lowLow' : 'lowHigh';
  }
  return value <= 7 ? 'highLow' : 'highHigh';
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
  const patterns = extractCodeValuesFromBaseSequence(
    collectPrimaryRunLengths(result.runs, side),
    side,
  );
  const hints = [
    ...patterns.oneDuplicate.slice(-2),
    ...patterns.threeOrMore.slice(-2),
    ...patterns.fiveOrMore.slice(-1),
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

  const suffixLen = Math.min(3, liveRuns.length);
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

  return { low, high, reason: `run 흐름 ${liveSuffix} → 다음 run ${matches}건` };
}

function sideMainPatternStrength(result: AnalysisResult, side: DigitClass): number {
  const s = collectPrimaryRunLengths(result.runs, side);
  if (s.length === 0) return 0;

  const detail = analyzeCodeValueMainDetail(s, side);
  let strength = 0;
  for (const row of detail.rows) {
    if (row.values.length === 0) continue;
    const rule = CODE_VALUE_MAIN_RULES.find((r) => r.code === row.code);
    const weight = rule ? (PATTERN_FIELD_WEIGHTS[rule.field] ?? 0.5) : 0.5;
    const tail = row.values.slice(-2);
    strength += weight * tail.reduce((a, v) => a + Math.max(v, 1), 0);
  }
  return strength;
}

function resolveMainBand(
  result: AnalysisResult,
  prefix: string,
): { band: DigitBand; side: DigitClass; reasons: string[] } {
  const reasons: string[] = [];
  const context = prefix.length > 0 ? result.digits + prefix : result.digits;
  const live = trailingRunProgress(context);

  if (live) {
    const expected = inferExpectedRunLength(result, live.side);
    if (live.progress < expected) {
      const band = sideToBand(live.side);
      reasons.push(
        `${band === 'low' ? '저점' : '고점'} run 진행 (${live.progress}/${expected}) — S 패턴 run 지속`,
      );
      return { band, side: live.side, reasons };
    }
    reasons.push(
      `${live.side === 'low' ? '저점' : '고점'} run ${live.progress}자리 — 기대 ${expected} 도달`,
    );
  }

  const vote = voteNextClassFromRunSuffix(result, prefix);
  reasons.push(vote.reason);

  if (vote.low !== vote.high) {
    const side: DigitClass = vote.low > vote.high ? 'low' : 'high';
    const band = sideToBand(side);
    reasons.push(`run suffix → ${getMainBandLabel(band)}`);
    return { band, side, reasons };
  }

  const lowStrength = sideMainPatternStrength(result, 'low');
  const highStrength = sideMainPatternStrength(result, 'high');
  const side: DigitClass = lowStrength >= highStrength ? 'low' : 'high';
  const band = sideToBand(side);
  reasons.push(
    `저·고 Code/Values 패턴 강도 ${lowStrength.toFixed(1)} / ${highStrength.toFixed(1)} → ${getMainBandLabel(band)}`,
  );
  return { band, side, reasons };
}

function getMainDetailForSide(result: AnalysisResult, side: DigitClass) {
  const s = side === 'low' ? result.lowRunLengths : result.highRunLengths;
  return analyzeCodeValueMainDetail(s, side);
}

function getSubDetailRowsForSide(result: AnalysisResult, side: DigitClass): CodeValueSubAnalysisRow[] {
  const main = getMainDetailForSide(result, side);
  if (main.patterns.oneDuplicate.length === 0) return [];
  return analyzeCodeValueSubDetail(main.patterns.oneDuplicate, side).rows;
}

function resolveSubBandFromSubDetail(
  result: AnalysisResult,
  mainBand: DigitBand,
  subDetailRows: CodeValueSubAnalysisRow[],
): { sub: DigitSubBand; reasons: string[] } {
  const reasons: string[] = [];
  const scores = new Map<DigitSubBand, number>();
  for (const sub of SUB_BANDS_FOR_MAIN[mainBand]) {
    scores.set(sub, 0);
  }

  for (const row of subDetailRows) {
    if (row.values.length === 0) continue;
    const rule = CODE_VALUE_SUB_DETAIL_RULES.find((r) => r.code === row.code);
    const weight = rule ? (PATTERN_FIELD_WEIGHTS[rule.field] ?? 0.5) : 0.5;
    for (const v of row.values.slice(-2)) {
      const hint = patternValueToSubBandHint(v, mainBand);
      if (SUB_BANDS_FOR_MAIN[mainBand].includes(hint)) {
        scores.set(hint, (scores.get(hint) ?? 0) + weight * (1 + v * 0.1));
        reasons.push(`세부 ${row.code} ${v} → ${getSubBandLabel(hint)}`);
      }
    }
  }

  const side = bandToSide(mainBand);
  const s = side === 'low' ? result.lowRunLengths : result.highRunLengths;
  if (s.length > 0 && subDetailRows.length === 0) {
    const tail = s.slice(-2);
    for (const v of tail) {
      const hint = patternValueToSubBandHint(v, mainBand);
      if (SUB_BANDS_FOR_MAIN[mainBand].includes(hint)) {
        scores.set(hint, (scores.get(hint) ?? 0) + 0.6);
      }
    }
    reasons.push(`S 꼬리 [${tail.join(', ')}] (세분화 없음)`);
  }

  let best: DigitSubBand = SUB_BANDS_FOR_MAIN[mainBand][0]!;
  let bestScore = -1;
  for (const [sub, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      best = sub;
    }
  }

  if (bestScore <= 0) {
    best = mainBand === 'low' ? 'lowHigh' : 'highLow';
    reasons.push('세분화 힌트 없음 → 기본 세부 구간');
  }

  reasons.push(`세부 구간 ${getSubBandLabel(best)}`);
  return { sub: best, reasons };
}

function initDigitScores(pool: readonly number[]): Map<number, number> {
  const scores = new Map<number, number>();
  for (const d of pool) {
    scores.set(d, 0.1);
  }
  return scores;
}

function formatRunSuffix(runs: ClassRun[], endExclusive: number, suffixLen: number): string {
  return runs
    .slice(endExclusive - suffixLen, endExclusive)
    .map((r) => `${r.cls}:${r.length}`)
    .join('|');
}

/**
 * S/run 흐름이 일치하는 Master 위치에서 실제로 이어진 숫자를 점수화.
 * S 패턴 값(1,1,1…)을 digit 1로 매핑하지 않음.
 */
function scoreDigitsFromMasterFlow(
  result: AnalysisResult,
  prefix: string,
  pool: readonly number[],
  activeSide: DigitClass,
): { scores: Record<number, number>; reasons: string[] } {
  const scores = initDigitScores(pool);
  const reasons: string[] = [];
  const master = result.digits;
  if (!master || pool.length === 0) {
    return { scores: Object.fromEntries(scores), reasons };
  }

  const context = prefix.length > 0 ? master + prefix : master;
  const liveRuns = buildRuns(toClassSequence(context));
  const masterRuns = buildRuns(toClassSequence(master));
  const suffixLen = Math.min(3, liveRuns.length);
  const live = trailingRunProgress(context);

  if (live) {
    const expected = inferExpectedRunLength(result, live.side);
    if (live.side === activeSide && live.progress < expected) {
      for (const run of masterRuns) {
        if (run.cls !== live.side || run.length <= live.progress) continue;
        const idx = run.startIndex + live.progress;
        if (idx >= master.length) continue;
        const d = Number(master[idx]);
        if (!Number.isInteger(d) || !pool.includes(d)) continue;
        scores.set(d, (scores.get(d) ?? 0) + 1);
      }
      if ([...scores.values()].some((v) => v > 0.1)) {
        reasons.push(
          `${live.side === 'low' ? '저' : '고'} run ${live.progress}/${expected} 지속 → Master 동일 run 실제 숫자`,
        );
        return { scores: Object.fromEntries(scores), reasons };
      }
    }
  }

  if (suffixLen === 0) {
    for (let i = master.length - 1; i >= 0; i -= 1) {
      const d = Number(master[i]);
      if (!pool.includes(d)) continue;
      if (classifyChar(master[i] ?? '') !== activeSide) continue;
      scores.set(d, (scores.get(d) ?? 0) + 1);
      reasons.push(`Master 최근 ${getMainBandLabel(activeSide === 'low' ? 'low' : 'high')} 숫자 ${d}`);
      return { scores: Object.fromEntries(scores), reasons };
    }
    return { scores: Object.fromEntries(scores), reasons };
  }

  const liveSuffix = formatRunSuffix(liveRuns, liveRuns.length, suffixLen);
  let matchCount = 0;

  for (let runIdx = suffixLen; runIdx <= masterRuns.length; runIdx += 1) {
    const histSuffix = formatRunSuffix(masterRuns, runIdx, suffixLen);
    if (histSuffix !== liveSuffix) continue;

    const boundaryRun = masterRuns[runIdx - 1];
    if (!boundaryRun) continue;
    const nextDigitIdx = boundaryRun.endIndex;
    if (nextDigitIdx >= master.length) continue;

    const nextDigit = Number(master[nextDigitIdx]);
    if (!Number.isInteger(nextDigit) || nextDigit < 0 || nextDigit > 9) continue;
    if (!pool.includes(nextDigit)) continue;

    matchCount += 1;
    scores.set(nextDigit, (scores.get(nextDigit) ?? 0) + 1);
  }

  if (matchCount > 0) {
    reasons.push(`run ${liveSuffix} 흐름 ${matchCount}건 → Master 실제 다음 숫자`);
    return { scores: Object.fromEntries(scores), reasons };
  }

  for (let i = master.length - 1; i >= 0; i -= 1) {
    const d = Number(master[i]);
    if (!pool.includes(d)) continue;
    if (classifyChar(master[i] ?? '') !== activeSide) continue;
    scores.set(d, (scores.get(d) ?? 0) + 1);
    reasons.push(`run 미매칭 → Master 최근 해당 구간 숫자 ${d}`);
    break;
  }

  return { scores: Object.fromEntries(scores), reasons };
}

function scoreSubDetailDigits(
  result: AnalysisResult,
  prefix: string,
  side: DigitClass,
  _mainBand: DigitBand,
  subBand: DigitSubBand,
  subDetailRows: CodeValueSubAnalysisRow[],
): { scores: Record<number, number>; codes: string[]; digitReasons: string[] } {
  void _mainBand;
  const pool = getDigitsInSubBand(subBand);
  const codes: string[] = [];

  for (const row of subDetailRows) {
    if (row.values.length > 0) codes.push(`세부 ${row.code}`);
  }

  const { scores, reasons } = scoreDigitsFromMasterFlow(result, prefix, pool, side);
  return { scores, codes, digitReasons: reasons };
}

function collectMainCodesForSide(result: AnalysisResult, side: DigitClass): string[] {
  const detail = getMainDetailForSide(result, side);
  return detail.rows.filter((row) => row.values.length > 0).map((row) => row.code);
}

/**
 * 매 자리 동일 경로: 저·고 run → Code/Values → 1중복 세분화(구간 판단) → Master 실제 숫자.
 */
export function resolvePatternRecommendationPath(
  result: AnalysisResult,
  prefix: string,
  stage: PatternPickStage | LegacyPatternPickStage = PATTERN_PICK_STAGE_FULL,
): PatternRecommendationPath {
  void stage;
  const { band: targetMainBand, side: activeSide, reasons: mainBandReasons } = resolveMainBand(
    result,
    prefix,
  );

  const subDetailRows = getSubDetailRowsForSide(result, activeSide);
  const { sub: targetSubBand, reasons: subBandReasons } = resolveSubBandFromSubDetail(
    result,
    targetMainBand,
    subDetailRows,
  );

  const { scores, codes: subCodes, digitReasons } = scoreSubDetailDigits(
    result,
    prefix,
    activeSide,
    targetMainBand,
    targetSubBand,
    subDetailRows,
  );

  return {
    activeSide,
    targetMainBand,
    targetSubBand,
    stage: PATTERN_PICK_STAGE_FULL,
    candidatePool: getDigitsInSubBand(targetSubBand),
    digitScores: scores,
    mainBandReasons,
    subBandReasons,
    digitReasons,
    activeMainCodes: collectMainCodesForSide(result, activeSide),
    activeSubDetailCodes: subCodes,
  };
}

/** @deprecated resolvePatternRecommendationPath 사용 */
export interface PatternFlowHierarchy {
  targetMainBand: DigitBand;
  targetSubBand: DigitSubBand;
  allowedDigits: readonly number[];
  digitPatternBoost: Record<number, number>;
  mainBandReasons: string[];
  subBandReasons: string[];
  digitReasons: string[];
  patternFlowReasons: string[];
  subDetailReasons: string[];
}

/** @deprecated resolvePatternRecommendationPath 사용 */
export function resolvePatternFlowHierarchy(
  result: AnalysisResult,
  prefix: string,
): PatternFlowHierarchy {
  const path = resolvePatternRecommendationPath(result, prefix, PATTERN_PICK_STAGE_FULL);
  return {
    targetMainBand: path.targetMainBand,
    targetSubBand: path.targetSubBand,
    allowedDigits: path.candidatePool,
    digitPatternBoost: path.digitScores,
    mainBandReasons: path.mainBandReasons,
    subBandReasons: path.subBandReasons,
    digitReasons: [...path.activeMainCodes, ...path.activeSubDetailCodes],
    patternFlowReasons: path.activeMainCodes,
    subDetailReasons: path.activeSubDetailCodes,
  };
}

export function getRecentRunLengthsForSide(result: AnalysisResult, side: DigitClass): number[] {
  return buildRuns(toClassSequence(result.digits))
    .filter((run: ClassRun) => run.cls === side)
    .map((run) => run.length);
}

export { trailingRunProgress };
