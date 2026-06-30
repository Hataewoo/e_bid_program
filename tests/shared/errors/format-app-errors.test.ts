import { describe, expect, it } from 'vitest';
import { AppErrorCode } from '@/shared/errors/app-error-codes';
import { formatAppError, formatAppErrors } from '@/i18n/format-app-errors';
import { useSettingsStore } from '@/stores/settings-store';

describe('formatAppError', () => {
  it('translates a bare error code in Korean', () => {
    useSettingsStore.setState({ language: 'ko' });
    expect(formatAppError(AppErrorCode.VAL_MASTER_NO)).toBe('마스터 번호는 00~99만 허용됩니다.');
  });

  it('translates contextual error codes', () => {
    useSettingsStore.setState({ language: 'en' });
    expect(formatAppError(`Master 01: ${AppErrorCode.VAL_MASTER_NO}`)).toBe(
      'Master 01: Master number must be between 00 and 99.',
    );
  });

  it('translates IPC timeout payloads', () => {
    useSettingsStore.setState({ language: 'ko' });
    expect(formatAppError(`${AppErrorCode.IPC_TIMEOUT}:master:getAll`)).toBe(
      'IPC 통신 시간 초과: master:getAll',
    );
  });

  it('passes through unknown free-form messages', () => {
    expect(formatAppError('custom runtime detail')).toBe('custom runtime detail');
  });
});

describe('formatAppErrors', () => {
  it('joins multiple codes and uses fallback when empty', () => {
    useSettingsStore.setState({ language: 'ko' });
    expect(
      formatAppErrors([AppErrorCode.VAL_CODE_REQUIRED, AppErrorCode.VAL_CODE_TYPE_REQUIRED]),
    ).toBe('코드명은 필수입니다., 구분(type)은 필수입니다.');
    expect(formatAppErrors([], 'error.saveFailed')).toBe('저장 실패');
  });
});

describe('AppErrorCode catalog', () => {
  it('defines at least 20 structured codes across VAL/DB/IPC', () => {
    const codes = Object.values(AppErrorCode);
    expect(codes.length).toBeGreaterThanOrEqual(20);
    expect(codes.some((c) => c.startsWith('VAL_'))).toBe(true);
    expect(codes.some((c) => c.startsWith('DB_'))).toBe(true);
    expect(codes.some((c) => c.startsWith('IPC_'))).toBe(true);
  });
});
