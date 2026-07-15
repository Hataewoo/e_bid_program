import { useI18n } from '@/i18n/use-i18n';
import { MasterValueTextarea } from '@/components/ui/MasterValueTextarea';
import { useReverseEngineeringStore } from '../stores/re-store';

export function MasterValuePanel() {
  const { t } = useI18n();
  const selectedMasterNo = useReverseEngineeringStore((s) => s.selectedMasterNo);
  const masterValue = useReverseEngineeringStore((s) => s.masterValue);

  return (
    <div className="flex h-full flex-col">
      <div className="win-panel-header">{t('re.masterValue.title', { no: selectedMasterNo })}</div>
      <div className="flex min-h-0 flex-1 flex-col p-2">
        <MasterValueTextarea readOnly value={masterValue} placeholder={t('re.masterValue.placeholder')} />
        <div className="mt-1 text-sm text-content-muted">
          {t('re.masterValue.footer', {
            length: masterValue.replace(/\s/g, '').length,
          })}
        </div>
      </div>
    </div>
  );
}
