import { memo } from 'react';
import { useI18n } from '@/i18n/use-i18n';

interface AnalysisLoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const AnalysisLoadingOverlay = memo(function AnalysisLoadingOverlay({
  visible,
  message,
}: AnalysisLoadingOverlayProps) {
  const { t } = useI18n();
  const displayMessage = message ?? t('analysis.status.analyzingBusy');

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#808080]/40">
      <div className="win-dialog-window shadow-md">
        <div className="win-titlebar text-xs">{t('analysis.overlay.title')}</div>
        <div className="flex items-center gap-3 bg-[#ece9d8] px-4 py-3">
          <div className="win-classic-spinner" aria-hidden="true" />
          <span className="text-[11px] font-semibold text-content">{displayMessage}</span>
        </div>
      </div>
    </div>
  );
});
