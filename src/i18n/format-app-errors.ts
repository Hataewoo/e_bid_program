import { AppErrorCode, isAppErrorCode } from '@/shared/errors/app-error-codes';
import { messages, type MessageKey } from './messages';
import { translate } from './translate';

function translateErrorCode(code: AppErrorCode, params?: Record<string, string | number>): string {
  const key = code as MessageKey;
  if (key in messages.ko) {
    return translate(key, params);
  }
  return code;
}

/** Resolve a raw error string (code, contextual code, or IPC timeout payload) to localized text. */
export function formatAppError(raw: string): string {
  const timeoutMatch = /^IPC_TIMEOUT:(.+)$/.exec(raw);
  if (timeoutMatch) {
    return translateErrorCode(AppErrorCode.IPC_TIMEOUT, { label: timeoutMatch[1] });
  }

  const contextMatch = /^(.+?):\s*([A-Z][A-Z0-9_]+)$/.exec(raw);
  if (contextMatch) {
    const [, context, code] = contextMatch;
    if (isAppErrorCode(code)) {
      return `${context}: ${translateErrorCode(code)}`;
    }
  }

  if (isAppErrorCode(raw)) {
    return translateErrorCode(raw);
  }

  return raw;
}

export function formatAppErrors(errors?: string[], fallbackKey?: MessageKey): string {
  if (!errors?.length) {
    return fallbackKey ? translate(fallbackKey) : '';
  }
  return errors.map(formatAppError).join(', ');
}
