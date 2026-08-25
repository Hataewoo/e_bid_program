import { describe, expect, it } from 'vitest';
import { AppErrorCode } from '@/shared/errors/app-error-codes';
import { MASTER_VALUE_MAX_LENGTH } from '@/shared/constants/master-value';
import {
  normalizeMasterValue,
  validationService,
} from '@/features/master/services/validation-service';

describe('master validation-service', () => {
  it('MASTER_VALUE_MAX_LENGTH is 5000', () => {
    expect(MASTER_VALUE_MAX_LENGTH).toBe(5000);
  });

  it('normalizeMasterValue truncates input beyond max length', () => {
    const raw = '1'.repeat(6000);
    expect(normalizeMasterValue(raw)).toHaveLength(MASTER_VALUE_MAX_LENGTH);
  });

  it('validateMasterInput accepts exactly max length', () => {
    const result = validationService.validateMasterInput({
      masterNo: '00',
      masterValue: '1'.repeat(MASTER_VALUE_MAX_LENGTH),
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('validateMasterData treats overlong input as truncated value', () => {
    const overlong = '1'.repeat(MASTER_VALUE_MAX_LENGTH + 1);
    const result = validationService.validateMasterData({
      masterNo: '00',
      masterValue: overlong,
    });
    expect(result.valid).toBe(true);
    expect(result.checks.lengthValid).toBe(true);
    expect(normalizeMasterValue(overlong)).toHaveLength(MASTER_VALUE_MAX_LENGTH);
  });

  it('validateMasterInput rejects empty value', () => {
    const result = validationService.validateMasterInput({
      masterNo: '00',
      masterValue: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(AppErrorCode.VAL_MASTER_VALUE_REQUIRED);
  });
});
