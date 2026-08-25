/**
 * ②′ 세분화 교차 검증 — 형제 sub-band(저저↔저고, 고저↔고고)
 *
 * anchor digit 기준 관련 코드(01·23·24·234·34·89·67 …) content 를 모두 집계해
 * 어느 sub-band 흐름이 더 맞는지 비교. 한 코드만 보면 skew 될 수 있음.
 */

import type { AnalysisResult, CodeMatchInput } from './analysisEngine';
import { getSubBandLabel, type DigitBand, type DigitSubBand } from './digitSubBand';
import { findLastDigitInSubBand, virtualMasterDigits } from './subBandRepeatJudgment';
import {
  dominantPhaseFromCodeFlow,
  formatCodeFlowVotes,
  resolvePrimaryCodeForDigit,
  scoreAnchorDigitCodeFlow,
  type AnchorCodeFlowScore,
} from './legacyCodeFlowAnalysis';

const SIBLING_SUB: Record<DigitSubBand, DigitSubBand> = {
  lowLow: 'lowHigh',
  lowHigh: 'lowLow',
  highLow: 'highHigh',
  highHigh: 'highLow',
};

export interface SubBandCrossRefineResult {
  sub: DigitSubBand;
  reasons: string[];
  primaryDigit: number | null;
  siblingDigit: number | null;
  primaryScore: AnchorCodeFlowScore | null;
  siblingScore: AnchorCodeFlowScore | null;
}

/** pool anchor digit — 해당 sub-band 꼬리 source 우선 */
export function resolveAnchorDigitForSubBand(
  context: string,
  subBand: DigitSubBand,
  pool: readonly number[],
): number | null {
  const inSub = findLastDigitInSubBand(context, subBand);
  if (inSub !== null && pool.includes(inSub)) return inSub;
  return null;
}

function scoreSubBandAtAnchor(
  result: AnalysisResult,
  mainBand: DigitBand,
  subBand: DigitSubBand,
  anchorDigit: number,
  codes: readonly CodeMatchInput[],
): AnchorCodeFlowScore {
  return scoreAnchorDigitCodeFlow(
    result,
    mainBand,
    anchorDigit,
    subBand,
    codes,
    resolvePrimaryCodeForDigit(anchorDigit, mainBand),
  );
}

function formatScoreLine(label: string, score: AnchorCodeFlowScore): string {
  return `②′ ${label} digit ${score.anchorDigit} [${score.consultedCodes.join('+')}] ${formatCodeFlowVotes(score.votes)} (유지${score.repeatWeight}/전환${score.transitionWeight})`;
}

/**
 * ② 1차 sub 확정 후 — 형제 sub-band 코드·내용 다중 비교
 */
export function refineSubBandWithSiblingCodeFlow(
  result: AnalysisResult,
  prefix: string,
  mainBand: DigitBand,
  initialSub: DigitSubBand,
  codes: readonly CodeMatchInput[] = [],
): SubBandCrossRefineResult {
  const context = virtualMasterDigits(result, prefix);
  const siblingSub = SIBLING_SUB[initialSub];
  const primaryLabel = getSubBandLabel(initialSub);
  const siblingLabel = getSubBandLabel(siblingSub);

  const primaryDigit = findLastDigitInSubBand(context, initialSub);
  if (primaryDigit === null) {
    const siblingDigit = findLastDigitInSubBand(context, siblingSub);
    if (siblingDigit !== null) {
      const siblingScore = scoreSubBandAtAnchor(result, mainBand, siblingSub, siblingDigit, codes);
      return {
        sub: siblingSub,
        reasons: [
          `②′ ${primaryLabel} anchor 없음`,
          formatScoreLine(siblingLabel, siblingScore),
          `→ ${siblingLabel} 채택`,
        ],
        primaryDigit: null,
        siblingDigit,
        primaryScore: null,
        siblingScore,
      };
    }
    return {
      sub: initialSub,
      reasons: [`②′ ${primaryLabel}·${siblingLabel} anchor 없음 → 1차 sub 유지`],
      primaryDigit: null,
      siblingDigit: null,
      primaryScore: null,
      siblingScore: null,
    };
  }

  const primaryScore = scoreSubBandAtAnchor(result, mainBand, initialSub, primaryDigit, codes);
  const primaryDominant = dominantPhaseFromCodeFlow(primaryScore);

  if (primaryDominant === 'repeat') {
    return {
      sub: initialSub,
      reasons: [formatScoreLine(primaryLabel, primaryScore), `→ ${primaryLabel} 유지`],
      primaryDigit,
      siblingDigit: null,
      primaryScore,
      siblingScore: null,
    };
  }

  const siblingDigit = findLastDigitInSubBand(context, siblingSub);
  if (siblingDigit === null) {
    return {
      sub: siblingSub,
      reasons: [
        formatScoreLine(primaryLabel, primaryScore),
        `②′ ${siblingLabel} 최근 digit 없음 → ${siblingLabel}`,
      ],
      primaryDigit,
      siblingDigit: null,
      primaryScore,
      siblingScore: null,
    };
  }

  const siblingScore = scoreSubBandAtAnchor(result, mainBand, siblingSub, siblingDigit, codes);
  const siblingDominant = dominantPhaseFromCodeFlow(siblingScore);

  const reasons = [
    formatScoreLine(primaryLabel, primaryScore),
    formatScoreLine(siblingLabel, siblingScore),
  ];

  if (siblingDominant === 'repeat' && siblingScore.netStay > primaryScore.netStay) {
    return {
      sub: siblingSub,
      reasons: [...reasons, `→ ${siblingLabel} 패턴·흐름 우세`],
      primaryDigit,
      siblingDigit,
      primaryScore,
      siblingScore,
    };
  }

  if (siblingScore.netStay > primaryScore.netStay) {
    return {
      sub: siblingSub,
      reasons: [...reasons, `→ ${siblingLabel} net 유지 우세 (${siblingScore.netStay}>${primaryScore.netStay})`],
      primaryDigit,
      siblingDigit,
      primaryScore,
      siblingScore,
    };
  }

  if (primaryScore.netStay > siblingScore.netStay) {
    return {
      sub: initialSub,
      reasons: [...reasons, `→ ${primaryLabel} net 유지 우세 → pool 흐름`],
      primaryDigit,
      siblingDigit,
      primaryScore,
      siblingScore,
    };
  }

  if (siblingScore.repeatWeight > primaryScore.repeatWeight) {
    return {
      sub: siblingSub,
      reasons: [...reasons, `→ ${siblingLabel} 유지표 ${siblingScore.repeatWeight}>`],
      primaryDigit,
      siblingDigit,
      primaryScore,
      siblingScore,
    };
  }

  return {
    sub: initialSub,
    reasons: [...reasons, `→ ${primaryLabel} pool 흐름 (교차 동점)`],
    primaryDigit,
    siblingDigit,
    primaryScore,
    siblingScore,
  };
}
