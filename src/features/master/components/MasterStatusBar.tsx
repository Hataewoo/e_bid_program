import { useMasterStore } from '../stores/master-store';
import { useI18n } from '@/i18n/use-i18n';

export function MasterStatusBar() {
  const { t } = useI18n();
  const statusMessage = useMasterStore((s) => s.statusMessage);
  const savedCount = useMasterStore((s) => s.savedCount);
  const selectedMasterNo = useMasterStore((s) => s.selectedMasterNo);
  const isDirty = useMasterStore((s) => s.isDirty);

  return (
    <div className="win-statusbar flex items-center justify-between px-3">
      <span>{statusMessage}</span>
      <div className="flex items-center gap-4">
        <span>{t('common.selected', { value: selectedMasterNo })}</span>
        <span>{t('common.recordCountColon', { count: savedCount })}</span>
        {isDirty && <span className="text-status-warning">{t('common.dirty')}</span>}
      </div>
    </div>
  );
}
