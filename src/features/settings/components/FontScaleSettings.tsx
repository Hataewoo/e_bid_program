import { useMemo } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import {
  FONT_SCALE_DEFAULT,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
} from '@/shared/constants/font-scale';
import { useSettingsStore } from '@/stores/settings-store';

export function FontScaleSettings() {
  const { t } = useI18n();
  const fontScale = useSettingsStore((s) => s.fontScale);
  const setFontScale = useSettingsStore((s) => s.setFontScale);

  const percent = useMemo(() => Math.round(fontScale * 100), [fontScale]);
  const minPercent = Math.round(FONT_SCALE_MIN * 100);
  const maxPercent = Math.round(FONT_SCALE_MAX * 100);
  const stepPercent = Math.round(FONT_SCALE_STEP * 100);

  return (
    <div className="card">
      <h3 className="mb-1 text-sm font-semibold text-content">{t('settings.font.title')}</h3>
      <p className="mb-4 text-sm text-content-muted">{t('settings.font.hint')}</p>

      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="font-scale-slider" className="text-sm text-content">
              {t('settings.font.scaleLabel')}
            </label>
            <span className="min-w-[3.5rem] text-right font-mono text-sm font-semibold text-content">
              {percent}%
            </span>
          </div>
          <input
            id="font-scale-slider"
            type="range"
            min={minPercent}
            max={maxPercent}
            step={stepPercent}
            value={percent}
            onChange={(e) => setFontScale(Number(e.target.value) / 100)}
            className="w-full accent-accent"
          />
          <div className="mt-1 flex justify-between text-xs text-content-muted">
            <span>{minPercent}%</span>
            <span>{maxPercent}%</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-content-muted" htmlFor="font-scale-number">
            {t('settings.font.directInput')}
          </label>
          <input
            id="font-scale-number"
            type="number"
            min={minPercent}
            max={maxPercent}
            step={stepPercent}
            value={percent}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next)) return;
              setFontScale(next / 100);
            }}
            className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-center font-mono text-sm text-content"
          />
          <span className="text-sm text-content-muted">%</span>
          <button
            type="button"
            className="win-button text-xs"
            onClick={() => setFontScale(FONT_SCALE_DEFAULT)}
          >
            {t('settings.font.reset')}
          </button>
        </div>

        <div className="rounded-md border border-border bg-surface-muted p-3">
          <div className="mb-1 text-xs text-content-muted">{t('settings.font.preview')}</div>
          <div className="win-textarea-master win-textarea-master-readable border border-[#404040] bg-white text-black">
            0123456789 ABCD
          </div>
          <p className="mt-2 text-sm text-content">{t('settings.font.previewBody')}</p>
        </div>
      </div>
    </div>
  );
}
