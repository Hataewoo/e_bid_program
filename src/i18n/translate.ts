import { messages, type MessageKey } from './messages';
import { useSettingsStore } from '@/stores/settings-store';

/** Standalone i18n for stores/services (outside React hooks). */
export function translate(key: MessageKey, params?: Record<string, string | number>): string {
  const language = useSettingsStore.getState().language;
  let text: string = messages[language][key] ?? messages.ko[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
