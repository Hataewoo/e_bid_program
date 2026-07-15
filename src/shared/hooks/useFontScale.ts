import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings-store';

export function applyFontScaleToDocument(fontScale: number): void {
  document.documentElement.style.setProperty('--font-scale', String(fontScale));
}

export function useFontScale(): void {
  const fontScale = useSettingsStore((s) => s.fontScale);

  useEffect(() => {
    applyFontScaleToDocument(fontScale);
  }, [fontScale]);
}
