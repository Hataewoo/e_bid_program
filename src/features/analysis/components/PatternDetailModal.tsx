import { memo } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import type { PatternModalState } from '../types/pattern-rows';

interface PatternDetailModalProps {
  modal: PatternModalState | null;
  masterNo: string;
  onClose: () => void;
}

export const PatternDetailModal = memo(function PatternDetailModal({
  modal,
  masterNo,
  onClose,
}: PatternDetailModalProps) {
  const { t } = useI18n();

  if (!modal) return null;

  const kindLabel =
    modal.valueKind === 'index'
      ? t('analysis.pattern.kind.index')
      : t('analysis.pattern.kind.length');
  const sideLabel = modal.side === 'low' ? 'Low' : 'High';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="win-dialog-window flex max-h-[80vh] w-full max-w-md flex-col shadow-lg">
        <div className="win-titlebar flex items-center justify-between">
          <span>{t('analysis.pattern.detailTitle', { side: sideLabel, code: modal.code })}</span>
          <button type="button" className="win-button text-xs" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>

        <div className="space-y-2 p-3 text-sm">
          <div>
            <span className="text-content-muted">{t('analysis.pattern.masterNo')} </span>
            <span className="font-semibold">{masterNo}</span>
          </div>
          <div>
            <span className="text-content-muted">{t('analysis.pattern.condition')} </span>
            <span className="font-semibold text-[#0000ff]">{modal.code}</span>
          </div>
          <div>
            <span className="text-content-muted">{t('analysis.pattern.matchCount')} </span>
            <span>{modal.values.length}</span>
          </div>
          <div>
            <span className="text-content-muted">{kindLabel}: </span>
          </div>
          <pre className="max-h-48 overflow-auto border border-border bg-[#fffff0] p-2 font-mono text-xs text-[#0000ff]">
            {modal.values.length > 0 ? modal.values.join(', ') : t('analysis.pattern.noValues')}
          </pre>
        </div>
      </div>
    </div>
  );
});
