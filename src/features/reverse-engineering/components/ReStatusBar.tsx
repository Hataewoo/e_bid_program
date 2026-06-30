import { useI18n } from '@/i18n/use-i18n';
import { useReverseEngineeringStore } from '../stores/re-store';

export function ReStatusBar() {
  const { t } = useI18n();
  const statusMessage = useReverseEngineeringStore((s) => s.statusMessage);
  const selectedMasterNo = useReverseEngineeringStore((s) => s.selectedMasterNo);
  const analysisResult = useReverseEngineeringStore((s) => s.analysisResult);

  return (
    <div className="win-statusbar flex items-center justify-between px-3">
      <span>{statusMessage}</span>
      <div className="flex items-center gap-4">
        <span>{t('re.status.masterLabel', { no: selectedMasterNo })}</span>
        {analysisResult && (
          <span>{t('re.status.analysisLength', { length: analysisResult.step1.length })}</span>
        )}
      </div>
    </div>
  );
}
