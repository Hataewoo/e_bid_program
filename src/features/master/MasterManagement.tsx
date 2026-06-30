import '@/lib/ag-grid';
import { useEffect } from 'react';
import { MasterListPanel } from './components/MasterListPanel';
import { MasterInputPanel } from './components/MasterInputPanel';
import { ResizableSplitter } from '@/components/layout/ResizableSplitter';
import { useCrudKeyboardShortcuts } from '@/hooks';
import { useI18n } from '@/i18n/use-i18n';
import { useMasterStore } from './stores/master-store';

export function MasterManagement() {
  const { t } = useI18n();
  const loadMasters = useMasterStore((s) => s.loadMasters);
  const statusMessage = useMasterStore((s) => s.statusMessage);
  const selectedMasterNo = useMasterStore((s) => s.selectedMasterNo);
  const isDirty = useMasterStore((s) => s.isDirty);
  const isSaving = useMasterStore((s) => s.isSaving);
  const formValues = useMasterStore((s) => s.formValues);
  const handleNew = useMasterStore((s) => s.handleNew);
  const handleSave = useMasterStore((s) => s.handleSave);
  const handleDelete = useMasterStore((s) => s.handleDelete);

  useCrudKeyboardShortcuts({
    onNew: handleNew,
    onSave: handleSave,
    onDelete: handleDelete,
    canSave: isDirty && !isSaving,
    canDelete: Boolean(formValues.id) && !isSaving,
    canNew: !isSaving,
  });

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  return (
    <div className="win-window flex h-full flex-col">
      <div className="win-titlebar">{t('master.title')}</div>

      <ResizableSplitter
        storageKey="master-layout-width"
        defaultLeftWidth={360}
        minLeftWidth={280}
        minRightWidth={420}
        left={<MasterListPanel />}
        right={<MasterInputPanel />}
      />

      <div className="win-statusbar flex items-center justify-between px-3">
        <span>{statusMessage}</span>
        <div className="flex items-center gap-3">
          <span>{t('common.selected', { value: selectedMasterNo })}</span>
          {isDirty && <span className="text-status-warning">{t('common.dirty')}</span>}
        </div>
      </div>
    </div>
  );
}
