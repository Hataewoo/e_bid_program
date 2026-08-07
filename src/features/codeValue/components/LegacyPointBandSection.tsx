import { memo, useState } from 'react';
import type { LegacyPointBandContent } from '@/shared/utils/legacyEmyoungAlgorithms';
import { ResizableSplitter } from '@/components/layout/ResizableSplitter';
import { useI18n } from '@/i18n/use-i18n';
import { LegacyCommaContentTextarea } from './LegacyCommaContentTextarea';
import { LegacyPatternValueGridTable } from './LegacyPatternValueGridTable';

interface LegacyPointBandSectionProps {
  headerLabel: string;
  band: LegacyPointBandContent;
  storageKey: string;
}

/** E-Myoung txt_LowPoint_Low / grid_Code_Low_Low — DetailGrid + 10패턴 그리드 */
export const LegacyPointBandSection = memo(function LegacyPointBandSection({
  headerLabel,
  band,
  storageKey,
}: LegacyPointBandSectionProps) {
  const { t } = useI18n();
  const [popupOpen, setPopupOpen] = useState(false);
  const hasContent = band.content.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col border border-[#808080] bg-[#f0f0f0]">
      <div className="win-point-values-header flex shrink-0 items-center justify-between">
        <span className="font-semibold text-[#0000ff]">{headerLabel}</span>
        <button
          type="button"
          className="win-link-popup"
          disabled={!hasContent}
          onClick={() => setPopupOpen(true)}
        >
          {t('analysis.pattern.popup')}
        </button>
      </div>

      <ResizableSplitter
        storageKey={storageKey}
        defaultLeftWidth={280}
        minLeftWidth={160}
        minRightWidth={220}
        left={
          <div className="flex h-full min-h-0 flex-col bg-white">
            {hasContent ? (
              <LegacyCommaContentTextarea value={band.content} className="min-h-0 flex-1" />
            ) : (
              <div className="flex flex-1 items-center justify-center p-3 text-xs text-content-muted">
                {t('codeValue.legacy.noSubBandSequence')}
              </div>
            )}
          </div>
        }
        right={
          <div className="win-pattern-values-panel h-full min-h-0 overflow-auto p-0">
            <LegacyPatternValueGridTable rows={band.patternGrid} />
          </div>
        }
      />

      {popupOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="win-dialog-window flex max-h-[90vh] w-full max-w-4xl flex-col shadow-lg">
            <div className="win-titlebar flex items-center justify-between">
              <span>{headerLabel}</span>
              <button type="button" className="win-button text-xs" onClick={() => setPopupOpen(false)}>
                {t('common.close')}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="mb-1 text-xs text-content-muted">{t('codeValue.legacy.pointBandPopupHint')}</div>
              <pre className="win-legacy-comma-content max-h-[60vh]">{band.content || t('analysis.pattern.noValues')}</pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});
