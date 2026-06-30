import { useAppStore } from '@/app/stores';
import { formatAppError } from '@/i18n/format-app-errors';
import { AppErrorCode } from '@/shared/errors/app-error-codes';

export const IPC_TIMEOUT_MS = 30_000;

export function reportSystemError(message: string, options?: { alert?: boolean }): void {
  useAppStore.getState().setSystemError(message);
  if (options?.alert) {
    useAppStore.getState().pushAlert(message);
  }
}

export async function withIpcGuard<T>(
  label: string,
  fn: () => Promise<T>,
  options?: { timeoutMs?: number; alertOnFail?: boolean },
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? IPC_TIMEOUT_MS;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${AppErrorCode.IPC_TIMEOUT}:${label}`)),
          timeoutMs,
        );
      }),
    ]);
    return result;
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const message = formatAppError(raw);
    const isIpcIssue =
      raw.startsWith(AppErrorCode.IPC_TIMEOUT) ||
      raw === AppErrorCode.IPC_UNAVAILABLE ||
      raw === AppErrorCode.DB_NOT_INIT ||
      message.includes('IPC') ||
      message.includes('Electron API') ||
      message.includes('Database');

    if (isIpcIssue) {
      reportSystemError(message, { alert: options?.alertOnFail ?? false });
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
