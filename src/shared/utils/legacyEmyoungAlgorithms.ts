/**
 * E-Myoung.exe 디컴파일 — mod_function.cs 핵심 알고리즘 (VB 1-based → TS 0-based)
 */

/** mod_function.SearchValue_Result_LH */
export function searchValueResultLH(
  mode: 'LOW' | 'HIGH',
  masterDigits: string,
  thresholdDigit: string,
): string {
  const threshold = Number(thresholdDigit);
  let out = '';
  for (let i = 0; i < masterDigits.length; i += 1) {
    const ch = masterDigits[i]!;
    const digit = Number(ch);
    if (!Number.isFinite(digit)) continue;
    if (mode === 'LOW') {
      if (digit < threshold) out += ch;
    } else if (digit > threshold) {
      out += ch;
    }
  }
  return out;
}

/** DetailGrid / DetailGrid_OverNumber / STEP2_Low / STEP2_High — 동일 IL */
export function searchValueResultDetailGrid(
  original: string,
  objectDigits: string,
  baseDigits: string,
): number[] {
  const orig = original.replace(/,/g, '');
  if (!orig || !objectDigits || !baseDigits) return [];

  let num = 0;
  const gaps: number[] = [];

  for (let i = 0; i < orig.length; i += 1) {
    const ch = orig[i]!;
    let handled = false;

    for (let j = 0; j < objectDigits.length && !handled; j += 1) {
      if (ch === objectDigits[j]) {
        num += 1;
        handled = true;
        break;
      }
      for (let k = 0; k < baseDigits.length; k += 1) {
        if (Number(ch) === Number(baseDigits[k])) {
          if (num > 0) gaps.push(num);
          num = 0;
          handled = true;
          break;
        }
      }
    }
  }

  if (num > 0) gaps.push(num);
  return gaps;
}

export function formatDetailGridGaps(gaps: readonly number[]): string {
  return gaps.join(',');
}

export const searchValueResultStep2Low = searchValueResultDetailGrid;
export const searchValueResultStep2High = searchValueResultDetailGrid;
export const searchValueResultDetailGridOverNumber = searchValueResultDetailGrid;

/** mod_function.Select_Array_Value — comma-separated gap string → array */
export function parseLegacyCommaArray(original: string): string[] {
  if (!original) return [''];
  const parts = original.split(',');
  return parts.length > 0 ? parts : [''];
}

/** mod_function.SearchValue_Result_Between */
export function searchValueResultBetween(
  values: readonly string[],
  objectDigit: string,
  baseDigit: string,
): string {
  let num = 0;
  let text = '';
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i]!;
    if (Number(v) >= Number(baseDigit)) {
      if (num > 0) text += `${num},`;
      num = 0;
    } else if (Number(v) >= Number(objectDigit)) {
      num += 1;
    }
  }
  if (num > 0) text += String(num);
  if (text.endsWith(',')) text = text.slice(0, -1);
  return text;
}

/** mod_function.SearchValue_Result_Between_Five / _Six — base exact match */
function searchValueResultBetweenExactBase(
  values: readonly string[],
  objectDigit: string,
  baseDigit: string,
): string {
  let num = 0;
  let text = '';
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i]!;
    if (v === baseDigit) {
      if (num > 0) text += `${num},`;
      num = 0;
    } else if (Number(v) >= Number(objectDigit)) {
      num += 1;
    }
  }
  if (num > 0) text += String(num);
  if (text.endsWith(',')) text = text.slice(0, -1);
  return text;
}

/** mod_function.SearchValue_Result_Duplicat_Array — RearchRs_Grid_Code row modes */
export function searchValueResultDuplicatArray(
  mode: 'first' | 'Duplicat' | 'OverSting' | 'Between',
  original: string,
  objectLabel: string,
  baseLabel: string,
): string {
  const values = parseLegacyCommaArray(original);
  const objectDigit = objectLabel.trim().slice(0, 1);

  if (mode === 'first' || mode === 'Duplicat') {
    let num2 = 0;
    let text = '';
    for (let i = 0; i < values.length; i += 1) {
      const v = values[i]!;
      if (v === objectDigit) {
        num2 += 1;
      } else if (v !== objectDigit && v !== '1') {
        if (num2 > 0) text += `${num2},`;
        num2 = 0;
      }
    }
    if (num2 > 0) text += String(num2);
    if (text.endsWith(',')) text = text.slice(0, -1);
    return text;
  }

  if (mode === 'OverSting') {
    let text = '';
    for (let i = 0; i < values.length; i += 1) {
      const v = values[i]!;
      if (Number(v) >= Number(objectDigit)) text += `${v},`;
    }
    if (text.endsWith(',')) text = text.slice(0, -1);
    return text;
  }

  if (mode === 'Between') {
    switch (baseLabel) {
      case '1 사이':
        return searchValueResultBetweenExactBase(values, '2', '1');
      case '3+α,2':
        return searchValueResultBetweenExactBase(values, '3', '2');
      case '4+α,3':
        return searchValueResultBetweenExactBase(values, '4', '3');
      case '5+α,4':
        return searchValueResultBetweenExactBase(values, '5', '4');
      default:
        switch (objectDigit) {
          case '1': {
            let text = '';
            for (let i = 0; i < values.length; i += 1) {
              const v = values[i]!;
              if (Number(v) > Number(objectDigit)) text += `${v},`;
            }
            if (text.endsWith(',')) text = text.slice(0, -1);
            return text;
          }
          case '2':
            return searchValueResultBetween(values, objectDigit, '3');
          case '3':
            return searchValueResultBetween(values, objectDigit, '4');
          case '4':
            return searchValueResultBetween(values, objectDigit, '5');
          case '5':
            return searchValueResultBetweenExactBase(values, objectDigit, '4');
          default:
            return '';
        }
    }
  }

  return '';
}

/** grid row labels — frmMasterDetail Init grids (10 rows) */
export const LEGACY_PATTERN_VALUE_GRID_LABELS = [
  '1 중복',
  '2,3+α',
  '3,4+α',
  '4,5+α',
  '5+α,4',
  '3 이상',
  '5 이상',
  '1 사이',
  '3+α,2',
  '4+α,3',
] as const;

export interface LegacyPatternValueGridRow {
  label: string;
  content: string;
}

/** mod_function.RearchRs_Grid_Code */
export function buildLegacyPatternValueGrid(originalCommaSeq: string): LegacyPatternValueGridRow[] {
  return LEGACY_PATTERN_VALUE_GRID_LABELS.map((label, rowIndex) => {
    let mode: 'first' | 'Duplicat' | 'OverSting' | 'Between';
    let baseLabel = label;

    if (rowIndex === 0) {
      mode = 'first';
    } else if (rowIndex >= 5 && rowIndex <= 6) {
      mode = 'OverSting';
    } else if (rowIndex >= 1 && rowIndex <= 4) {
      mode = 'Between';
    } else if (rowIndex >= 6 && rowIndex <= 9) {
      mode = 'Between';
      baseLabel = label;
    } else {
      mode = 'Duplicat';
    }

    const content = searchValueResultDuplicatArray(mode, originalCommaSeq, label, baseLabel);
    return { label, content };
  });
}

/** frmMasterDetail.load_grid_Code_Low_RS — Point Values sub-band split */
export const LEGACY_STEP2_POINT_BAND_SPLITS = {
  lowLow: { object: '01', base: '234' },
  lowHigh: { object: '234', base: '01' },
} as const;

/** frmMasterDetail.load_grid_Code_High_RS */
export const LEGACY_STEP3_POINT_BAND_SPLITS = {
  highLow: { object: '567', base: '89' },
  highHigh: { object: '89', base: '567' },
} as const;

/** SearchValue_High_Low — Master count fields */
export const LEGACY_MASTER_COUNT_SPLITS = {
  step2LowOnMaster: { object: '01234', base: '56789' },
  step2HighOnMaster: { object: '56789', base: '01234' },
} as const;

export interface LegacyPointBandContent {
  content: string;
  gaps: number[];
  patternGrid: LegacyPatternValueGridRow[];
}

export function buildLegacyPointBandContent(
  detailDigits: string,
  objectDigits: string,
  baseDigits: string,
): LegacyPointBandContent {
  const gaps = searchValueResultDetailGrid(detailDigits, objectDigits, baseDigits);
  const content = formatDetailGridGaps(gaps);
  return { content, gaps, patternGrid: buildLegacyPatternValueGrid(content) };
}

/** frmMasterDetail — Right(Remark, 2) */
export function legacyRemarkSuffix(remark: string): string {
  if (!remark) return '';
  return remark.slice(-2);
}

/** load_grid_Code_* — remark suffix gate */
export function shouldComputeLegacyCodeContent(remark: string): boolean {
  const suffix = legacyRemarkSuffix(remark);
  return suffix === '저점' || suffix === '고점';
}

/** load_grid_Code_Low/High_RS — Name → object/base */
export function resolveLegacyCodeObjectBase(code: string): {
  objectDigits: string;
  baseDigits: string;
} {
  if (code.length === 5) {
    if (code === '01234') return { objectDigits: code.slice(0, 2), baseDigits: code.slice(2) };
    if (code === '23401') return { objectDigits: code.slice(0, 3), baseDigits: code.slice(3) };
    if (code === '56789') return { objectDigits: code.slice(0, 3), baseDigits: code.slice(3) };
    if (code === '89657') return { objectDigits: code.slice(0, 2), baseDigits: code.slice(2) };
  }
  return { objectDigits: code.slice(0, 1), baseDigits: code.slice(1) };
}

export function computeLegacyCodeContentGaps(
  detailDigits: string,
  code: string,
  remark: string,
): number[] {
  if (!shouldComputeLegacyCodeContent(remark)) return [];
  const { objectDigits, baseDigits } = resolveLegacyCodeObjectBase(code);
  return searchValueResultDetailGrid(detailDigits, objectDigits, baseDigits);
}

export interface LegacyStep2BandBundle {
  detailDigits: string;
  masterCountLow: string;
  masterCountHigh: string;
  pointLowLow: LegacyPointBandContent;
  pointLowHigh: LegacyPointBandContent;
}

export interface LegacyStep3BandBundle {
  detailDigits: string;
  masterCountLow: string;
  masterCountHigh: string;
  pointHighLow: LegacyPointBandContent;
  pointHighHigh: LegacyPointBandContent;
}

export function buildLegacyStep2BandBundle(masterDigits: string): LegacyStep2BandBundle {
  const detailDigits = searchValueResultLH('LOW', masterDigits, '5');
  const mc = LEGACY_MASTER_COUNT_SPLITS;
  const masterCountLow = formatDetailGridGaps(
    searchValueResultDetailGrid(masterDigits, mc.step2LowOnMaster.object, mc.step2LowOnMaster.base),
  );
  const masterCountHigh = formatDetailGridGaps(
    searchValueResultDetailGrid(masterDigits, mc.step2HighOnMaster.object, mc.step2HighOnMaster.base),
  );
  const s2 = LEGACY_STEP2_POINT_BAND_SPLITS;
  return {
    detailDigits,
    masterCountLow,
    masterCountHigh,
    pointLowLow: buildLegacyPointBandContent(detailDigits, s2.lowLow.object, s2.lowLow.base),
    pointLowHigh: buildLegacyPointBandContent(detailDigits, s2.lowHigh.object, s2.lowHigh.base),
  };
}

export function buildLegacyStep3BandBundle(masterDigits: string): LegacyStep3BandBundle {
  const detailDigits = searchValueResultLH('HIGH', masterDigits, '4');
  const mc = LEGACY_MASTER_COUNT_SPLITS;
  const masterCountLow = formatDetailGridGaps(
    searchValueResultDetailGrid(masterDigits, mc.step2LowOnMaster.object, mc.step2LowOnMaster.base),
  );
  const masterCountHigh = formatDetailGridGaps(
    searchValueResultDetailGrid(masterDigits, mc.step2HighOnMaster.object, mc.step2HighOnMaster.base),
  );
  const s3 = LEGACY_STEP3_POINT_BAND_SPLITS;
  return {
    detailDigits,
    masterCountLow,
    masterCountHigh,
    pointHighLow: buildLegacyPointBandContent(detailDigits, s3.highLow.object, s3.highLow.base),
    pointHighHigh: buildLegacyPointBandContent(detailDigits, s3.highHigh.object, s3.highHigh.base),
  };
}

/** UI — STEP2/STEP3 하단 2구간 + Master Count */
export interface LegacyStepPanelBands {
  masterCountLow: string;
  masterCountHigh: string;
  primaryBand: LegacyPointBandContent;
  secondaryBand: LegacyPointBandContent;
}

export function buildLegacyStepPanelBands(
  masterDigits: string,
  side: 'low' | 'high',
): LegacyStepPanelBands {
  if (side === 'low') {
    const bundle = buildLegacyStep2BandBundle(masterDigits);
    return {
      masterCountLow: bundle.masterCountLow,
      masterCountHigh: bundle.masterCountHigh,
      primaryBand: bundle.pointLowLow,
      secondaryBand: bundle.pointLowHigh,
    };
  }
  const bundle = buildLegacyStep3BandBundle(masterDigits);
  return {
    masterCountLow: bundle.masterCountLow,
    masterCountHigh: bundle.masterCountHigh,
    primaryBand: bundle.pointHighLow,
    secondaryBand: bundle.pointHighHigh,
  };
}
