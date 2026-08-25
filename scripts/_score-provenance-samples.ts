/** One-off score provenance samples — run via pattern-predictive-validation or vite-node */
import { analyzeMasterValue, buildCodeValueStats } from '../src/shared/utils/analysisEngine';
import { resolvePatternRecommendPath } from '../src/shared/utils/patternRecommendEngine';
import { computeDigitPredictionScores, formatDigitScoreTrace } from '../src/shared/utils/digitCandidateScoring';

const cases = [
  { master: '5142716075797444702810858208', t: 19, label: '757974447028 tail' },
  { master: '6464512350067798989142098591', t: 14, label: '6464512350' },
  { master: '1949166983937425898964455403', t: 18, label: 'mid-sequence' },
];

for (const c of cases) {
  const history = c.master.slice(0, c.t + 1);
  const result = analyzeMasterValue('00', history);
  const stats = buildCodeValueStats(result, []);
  const codes = stats.map((row, i) => ({
    id: i,
    code: row.code,
    type: row.type ?? '',
    description: row.description ?? '',
  }));
  const path = resolvePatternRecommendPath(result, '', codes);
  const bd = computeDigitPredictionScores(path, result, '', codes, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const winner = bd.scores[0]!;
  console.log(`=== ${c.label} | winner ${winner.digit} | actual next ${c.master[c.t + 1]}`);
  console.log(formatDigitScoreTrace(winner));
  console.log('');
}
