export interface ComparisonDiff {
  fieldKey: string;
  legacyValue: string;
  oursValue: string;
  isMatch: boolean;
  diffType?: string;
  diffDetail?: string;
}

export class ComparisonService {
  compareField(fieldKey: string, legacy: string, ours: string): ComparisonDiff {
    const legacyVal = legacy ?? '';
    const oursVal = ours ?? '';

    if (legacyVal === oursVal) {
      return {
        fieldKey,
        legacyValue: legacyVal,
        oursValue: oursVal,
        isMatch: true,
        diffType: 'Match',
      };
    }

    if (legacyVal.length === 0 && oursVal.length > 0) {
      return {
        fieldKey,
        legacyValue: legacyVal,
        oursValue: oursVal,
        isMatch: false,
        diffType: 'Unexpected Value',
        diffDetail: 'Legacy empty, ours has value',
      };
    }

    if (legacyVal.length > 0 && oursVal.length === 0) {
      return {
        fieldKey,
        legacyValue: legacyVal,
        oursValue: oursVal,
        isMatch: false,
        diffType: 'Missing Value',
        diffDetail: 'Ours empty, legacy has value',
      };
    }

    if (legacyVal.length !== oursVal.length) {
      return {
        fieldKey,
        legacyValue: legacyVal,
        oursValue: oursVal,
        isMatch: false,
        diffType: 'Length Difference',
        diffDetail: `Legacy ${legacyVal.length} vs Ours ${oursVal.length}`,
      };
    }

    const minLen = Math.min(legacyVal.length, oursVal.length);
    for (let i = 0; i < minLen; i++) {
      if (legacyVal[i] !== oursVal[i]) {
        const isDigitDiff = /\d/.test(legacyVal[i]) || /\d/.test(oursVal[i]);
        return {
          fieldKey,
          legacyValue: legacyVal,
          oursValue: oursVal,
          isMatch: false,
          diffType: isDigitDiff ? 'Digit Difference' : 'Character Mismatch',
          diffDetail: `Index ${i}: '${legacyVal[i]}' vs '${oursVal[i]}'`,
        };
      }
    }

    return {
      fieldKey,
      legacyValue: legacyVal,
      oursValue: oursVal,
      isMatch: false,
      diffType: 'Character Mismatch',
      diffDetail: 'Values differ',
    };
  }

  compareOutputMaps(
    legacy: Record<string, string>,
    ours: Record<string, string>,
    keys?: string[],
  ): ComparisonDiff[] {
    const allKeys = keys ?? [...new Set([...Object.keys(legacy), ...Object.keys(ours)])];
    return allKeys.map((key) => this.compareField(key, legacy[key] ?? '', ours[key] ?? ''));
  }
}

export const comparisonService = new ComparisonService();
