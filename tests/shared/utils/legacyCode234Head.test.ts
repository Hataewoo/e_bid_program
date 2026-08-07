import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { analyzeMasterValue, filterDigitsByClass } from '@/shared/utils/analysisEngine';
import {
  descriptionToSubBandSequence,
  findTokenSubBandSequenceStarts,
  computeLegacyTokenGapSequence,
} from '@/shared/utils/legacyCodeContentEngine';
import { buildPointValueTokens } from '@/shared/utils/pointValuesCodeFlow';
import { getLegacyStepCodeDefinition } from '@/shared/fixtures/legacy-step-code-catalog';
import { LEGACY_MASTER_00_CODE_CONTENT } from '@/shared/fixtures/legacy-code-content-expected';

const USER_DB = 'C:/Users/USER/AppData/Roaming/cs-e-bid-program/database.db';

describe('234 head comparison', () => {
  it('prints gap heads', async () => {
    process.env.DATABASE_URL = `file:${USER_DB}`;
    const p = new PrismaClient();
    const m = await p.master.findFirst({ where: { masterNo: '00' } });
    await p.$disconnect();
    if (!m?.masterValue) return;

    const pv = filterDigitsByClass(analyzeMasterValue('00', m.masterValue).digits, 'low');
    const def = getLegacyStepCodeDefinition('234', 'low')!;
    const sub = descriptionToSubBandSequence(def.description, 'low')!;
    const starts = findTokenSubBandSequenceStarts(pv, sub);
    const expected = LEGACY_MASTER_00_CODE_CONTENT['234']!;

    const tokenBetween = computeLegacyTokenGapSequence(pv, starts, sub.length);
    const tokenIdx: number[] = [];
    for (let i = 0; i < starts.length - 1; i++) {
      tokenIdx.push(Math.max(1, starts[i + 1]! - (starts[i]! + sub.length - 1)));
    }

    const tokenObjs = buildPointValueTokens(pv);
    const tokenFirstDigit: number[] = [];
    let c = 0;
    for (const tok of tokenObjs) {
      tokenFirstDigit.push(c);
      c += tok.isRun ? tok.value : 1;
    }
    const tokenLastDigit = tokenObjs.map(
      (tok, ti) => tokenFirstDigit[ti]! + (tok.isRun ? tok.value : 1) - 1,
    );
    const digitStrict: number[] = [];
    for (let i = 0; i < starts.length - 1; i++) {
      const endD = tokenLastDigit[starts[i]! + sub.length - 1]!;
      const nextD = tokenFirstDigit[starts[i + 1]!]!;
      digitStrict.push(Math.max(1, nextD - endD - 1));
    }

    console.log('starts', starts.length);
    console.log('expected head', expected.split(',').slice(0, 12).join(','));
    console.log('between head', tokenBetween.slice(0, 12).join(','));
    console.log('tokenIdx head', tokenIdx.slice(0, 12).join(','));
    console.log('digitStrict head', digitStrict.slice(0, 12).join(','));
    console.log('starts head', starts.slice(0, 15).join(','));
    expect(starts.length).toBeGreaterThan(2);
  });
});
