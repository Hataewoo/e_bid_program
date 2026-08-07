/**
 * srcDigit 열 + Between 규칙 파라미터 brute-force (234 목표 60/60)
 */
import { describe, it } from 'vitest';
import { analyzeMasterValue, filterDigitsByClass } from '@/shared/utils/analysisEngine';
import { countBetweenMarkerRule } from '@/shared/utils/codeValueSubAnalysis';
import { buildPointValueTokens } from '@/shared/utils/pointValuesCodeFlow';
import { LEGACY_MASTER_00_CODE_CONTENT } from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';

describe('srcDigit between rule brute force for 234', () => {
  it('searches marker/count params', () => {
    const pv = filterDigitsByClass(analyzeMasterValue('00', LEGACY_MASTER_00_VALUE).digits, 'low');
    const srcDigit = buildPointValueTokens(pv).map((t) => t.sourceDigit);
    const exp = LEGACY_MASTER_00_CODE_CONTENT['234']!.split(',').map(Number);

    let best = { match: -1, label: '' };
    const hits: string[] = [];

    for (const markerExact of [0, 1, 2, 3, 4, undefined]) {
      for (const markerMin of [0, 1, 2, 3, 4, undefined]) {
        for (const countExact of [0, 1, 2, 3, 4, undefined]) {
          for (const countMin of [0, 1, 2, 3, 4, undefined]) {
            for (const pairsOnly of [true, false]) {
              if (markerExact !== undefined && markerMin !== undefined) continue;
              if (countExact !== undefined && countMin !== undefined) continue;
              const rule = {
                markerExact,
                markerMin: markerExact === undefined ? markerMin : undefined,
                markerMax: 4,
                countExact,
                countMin: countExact === undefined ? countMin : undefined,
                countMax: 4,
                pairsOnly,
              };
              if (rule.markerExact === undefined && rule.markerMin === undefined) continue;
              if (rule.countExact === undefined && rule.countMin === undefined) continue;

              const got = countBetweenMarkerRule(srcDigit, rule);
              if (got.length !== exp.length) continue;
              let m = 0;
              for (let i = 0; i < exp.length; i++) if (exp[i] === got[i]) m++;
              const label = JSON.stringify(rule);
              if (m > best.match) best = { match: m, label };
              if (m === exp.length) hits.push(label);
            }
          }
        }
      }
    }

    console.log('Best', best);
    console.log('Exact hits', hits.length, hits.slice(0, 5));
  });
});
