import { useState } from 'react';
import {
  DataImportModal,
  saveTextFileWithDialog,
  saveBinaryFileWithDialog,
} from '@/features/admin';
import { electronService } from '@/services';
import { mastersToCsv } from '@/shared/utils/dataExport';
import { mastersToXlsxBase64 } from '@/shared/utils/xlsxImport';
import { useI18n } from '@/i18n/use-i18n';
import { useMasterStore } from '../stores/master-store';

export function MasterToolbar() {
  const { t } = useI18n();
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const handleNew = useMasterStore((s) => s.handleNew);
  const handleSave = useMasterStore((s) => s.handleSave);
  const handleDelete = useMasterStore((s) => s.handleDelete);
  const handleValidate = useMasterStore((s) => s.handleValidate);
  const isSaving = useMasterStore((s) => s.isSaving);
  const isDirty = useMasterStore((s) => s.isDirty);
  const formValues = useMasterStore((s) => s.formValues);

  const handleExport = async () => {
    setExporting(true);
    try {
      const masters = await electronService.getAllMasters();
      const stamp = new Date().toISOString().slice(0, 10);
      await saveTextFileWithDialog(
        `masters-${stamp}.csv`,
        mastersToCsv(masters),
        t('export.masterTitle'),
      );
    } finally {
      setExporting(false);
    }
  };

  const handleExportXlsx = async () => {
    setExporting(true);
    try {
      const masters = await electronService.getAllMasters();
      const stamp = new Date().toISOString().slice(0, 10);
      await saveBinaryFileWithDialog(
        `masters-${stamp}.xlsx`,
        await mastersToXlsxBase64(masters),
        t('master.exportXlsx'),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="win-toolbar flex items-center justify-between px-3 py-1.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="win-button"
          onClick={() => setImportOpen(true)}
          disabled={isSaving}
        >
          {t('master.import')}
        </button>
        <button
          type="button"
          className="win-button"
          onClick={() => void handleExport()}
          disabled={isSaving || exporting}
        >
          {t('master.export')}
        </button>
        <button
          type="button"
          className="win-button"
          onClick={() => void handleExportXlsx()}
          disabled={isSaving || exporting}
        >
          {t('master.exportXlsx')}
        </button>
        <button type="button" className="win-button" onClick={handleNew} disabled={isSaving}>
          {t('master.new')}
        </button>
        <button
          type="button"
          className="win-button win-button-primary"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
        >
          {t('master.save')}
        </button>
        <button
          type="button"
          className="win-button win-button-danger"
          onClick={() => void handleDelete()}
          disabled={isSaving || !formValues.id}
        >
          {t('master.delete')}
        </button>
      </div>
      <button type="button" className="win-button" onClick={handleValidate} disabled={isSaving}>
        {t('master.validate')}
      </button>
      <DataImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
