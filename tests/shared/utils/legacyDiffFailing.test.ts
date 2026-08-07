import { describe, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import { buildLegacyStep2CodeContent } from '@/shared/utils/legacyCodeContentEngine';
import { LEGACY_MASTER_00_CODE_CONTENT } from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';

describe('diff failing codes', () => {
  it('prints first mismatch', () => {
    const got = buildLegacyStep2CodeContent(analyzeMasterValue('00', LEGACY_MASTER_00_VALUE).digits);
    for (const code of ['24', '324', '34', '423']) {
      const e = LEGACY_MASTER_00_CODE_CONTENT[code]!.split(',');
      const g = (got[code] ?? '').split(',');
      console.log(`\n=== ${code} exp=${e.length} got=${g.length} ===`);
      for (let i = 0; i < Math.max(e.length, g.length); i++) {
        if (e[i] !== g[i]) {
          console.log(`diff@${i}: exp=${e[i]} got=${g[i]}`);
          console.log('context exp:', e.slice(Math.max(0, i - 3), i + 4).join(','));
          console.log('context got:', g.slice(Math.max(0, i - 3), i + 4).join(','));
          break;
        }
      }
    }
  });
});
