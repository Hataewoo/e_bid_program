import type { MessageKey } from './messages';

/** Message key + params stored in state so UI re-translates on locale change. */
export type I18nStatus = {
  key: MessageKey;
  params?: Record<string, string | number>;
} | null;
