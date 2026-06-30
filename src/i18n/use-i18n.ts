import { useCallback } from 'react';
import { messages, type MessageKey } from './messages';
import { useSettingsStore } from '@/stores/settings-store';

export function useI18n() {
  const language = useSettingsStore((s) => s.language);

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>): string => {
      let text: string = messages[language][key] ?? messages.ko[key] ?? key;
      if (params) {
        for (const [name, value] of Object.entries(params)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [language],
  );

  return { t, language };
}
