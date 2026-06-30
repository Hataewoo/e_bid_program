import { useI18n } from '@/i18n/use-i18n';
import { useReverseEngineeringStore } from '../stores/re-store';

export function ExportToolbar() {
  const { t } = useI18n();
  const copyJson = useReverseEngineeringStore((s) => s.copyJson);
  const exportJson = useReverseEngineeringStore((s) => s.exportJson);
  const exportTxt = useReverseEngineeringStore((s) => s.exportTxt);
  const exportCsv = useReverseEngineeringStore((s) => s.exportCsv);
  const analysisResult = useReverseEngineeringStore((s) => s.analysisResult);
  const disabled = !analysisResult;

  return (
    <div className="win-toolbar flex items-center gap-1 px-3 py-1.5">
      <button type="button" className="win-button" onClick={copyJson} disabled={disabled}>
        {t('re.export.copyJson')}
      </button>
      <button type="button" className="win-button" onClick={exportJson} disabled={disabled}>
        {t('re.export.exportJson')}
      </button>
      <button type="button" className="win-button" onClick={exportTxt} disabled={disabled}>
        {t('re.export.exportTxt')}
      </button>
      <button type="button" className="win-button" onClick={exportCsv} disabled={disabled}>
        {t('re.export.exportCsv')}
      </button>
    </div>
  );
}
