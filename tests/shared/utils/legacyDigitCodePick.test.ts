import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  buildLegacyCodeContentForLastDigit,
  pickDigitByLegacyCodeContent,
  resolveLegacyCodeForLastDigit,
} from '@/shared/utils/legacyDigitCodePick';
import { resolveFinalDigitPick, resolvePatternRecommendPath } from '@/shared/utils/patternRecommendEngine';
import { inferPhaseFromSequence } from '@/shared/utils/subBandRepeatJudgment';

const USER_MASTER_TAIL =
  '9646451235006779898914209859151427160757974447028108582081949166983937425898964455403191405999772414950682346446970164689087486158643252834164691178376495108197906078600324795091954706151130973272056542469455521015656769284987045360138864695367381802706885862090417492076474038856206750398017436130085556428133127699360758808240968391228512807224244049566053394442644325605412704729739539543161240734544550544004485955093884786990620752203949703845231211420169221541826648618264601754370511694133468612764194932863418319300691686533249393815704180177731483393205855416379028449301764528291796498736475078071384034600974660534236618048022524696120343753342211159891428168088246272676859370916618586940505652302359856362854422933691195361781873175185600652287713791716510564162601961988572935797825516720805844788550718962281291943809116739216218454387116001842928529254901755008349411600466845711739664278210457455698714508283704651927633595544284222149592750891543708739110383708546046265340973771360';

describe('legacyDigitCodePick', () => {
  it('maps last digit 0 to code 01 on STEP2', () => {
    expect(resolveLegacyCodeForLastDigit(0, 'low')).toBe('01');
    expect(resolveLegacyCodeForLastDigit(1, 'low')).toBe('01');
    expect(resolveLegacyCodeForLastDigit(7, 'high')).toBe('67');
  });

  it('uses code 01 content for digit 0 repeat/transition (not value mapping)', () => {
    const result = analyzeMasterValue('00', USER_MASTER_TAIL);
    const pick = pickDigitByLegacyCodeContent([0, 1], result, '', 'lowLow', []);
    expect(pick).not.toBeNull();
    expect(pick!.reason).toMatch(/01|01234/);
    expect(pick!.digit).toBeGreaterThanOrEqual(0);
    expect(pick!.digit).toBeLessThanOrEqual(1);
    expect(pick!.reason).toMatch(/유지|전환/);
  });

  it('buildLegacyCodeContentForLastDigit returns gaps for code 01', () => {
    const result = analyzeMasterValue('00', USER_MASTER_TAIL);
    const { codeName, row } = buildLegacyCodeContentForLastDigit(result, 'low', 0, []);
    expect(codeName).toBe('01');
    expect(row.gaps.length).toBeGreaterThan(0);
  });
});

describe('inferPhaseFromSequence holistic', () => {
  it('1사이 repeat outweighs run transition hint', () => {
    const phase = inferPhaseFromSequence([1, 3, 2, 1, 3], 'low', 'lowLow', 0);
    expect(phase.phase).toBe('repeat');
    expect(phase.label).toContain('1사이');
  });

  it('combines 1사이 with run signals in label', () => {
    const phase = inferPhaseFromSequence([3, 2, 3, 4, 5], 'low', 'lowHigh', 3);
    expect(phase.label).toContain('digit 3');
  });
});

describe('user master 00 recommendation', () => {
  it('1사이 marker — tail 0 전환 시 고점 pool (②′ 교차검증)', () => {
    const result = analyzeMasterValue('00', USER_MASTER_TAIL);
    const path = resolvePatternRecommendPath(result, '', []);
    const pick = resolveFinalDigitPick(path, result, '', []);
    expect(path.targetMainBand).toBe('high');
    expect(path.targetSubBand).toBe('highHigh');
    expect(path.subBandReasons.some((r) => r.startsWith('②′'))).toBe(true);
    expect(pick?.digit).toBe(8);
    expect(pick?.mode).toBe('transition');
  });

  it('1사이 marker — tail 8 저고 패턴 우세 시 lowHigh·digit 2', () => {
    const master = readFileSync('scripts/_tmp_master.txt', 'utf8').trim();
    const result = analyzeMasterValue('00', master);
    const path = resolvePatternRecommendPath(result, '', []);
    const pick = resolveFinalDigitPick(path, result, '', []);
    expect(path.subBandReasons.some((r) => r.startsWith('②′'))).toBe(true);
    expect(path.targetSubBand).toBe('lowHigh');
    expect(pick?.digit).toBe(2);
    expect(pick?.mode).toBe('transition');
    expect(pick?.reason).toMatch(/324|34|23/);
  });
});
