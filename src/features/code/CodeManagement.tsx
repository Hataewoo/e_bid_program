import '@/lib/ag-grid';
import { useEffect, useState } from 'react';
import { CodeRegistrationForm } from './components/CodeRegistrationForm';
import { CodeRegistrationGrid } from './components/CodeRegistrationGrid';
import {
  CodeImportModal,
  saveTextFileWithDialog,
  saveBinaryFileWithDialog,
} from '@/features/admin';
import { electronService } from '@/services';
import { codesToCsv } from '@/shared/utils/dataExport';
import { codesToXlsxBase64 } from '@/shared/utils/xlsxImport';
import { useI18n } from '@/i18n/use-i18n';
import { useCrudKeyboardShortcuts } from '@/hooks';
import { useCodeStore } from './stores/code-store';
import { CODE_WINDOW_VERSION } from './types/code.types';

export function CodeManagement() {
  const { t } = useI18n();
  const loadCodes = useCodeStore((s) => s.loadCodes);
  const recordCount = useCodeStore((s) => s.recordCount);
  const statusMessage = useCodeStore((s) => s.statusMessage);
  const isWindowOpen = useCodeStore((s) => s.isWindowOpen);
  const openWindow = useCodeStore((s) => s.openWindow);
  const isDirty = useCodeStore((s) => s.isDirty);
  const isSaving = useCodeStore((s) => s.isSaving);
  const selectedId = useCodeStore((s) => s.selectedId);
  const handleNew = useCodeStore((s) => s.handleNew);
  const handleConfirm = useCodeStore((s) => s.handleConfirm);
  const handleDelete = useCodeStore((s) => s.handleDelete);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useCrudKeyboardShortcuts({
    enabled: isWindowOpen,
    onNew: handleNew,
    onSave: handleConfirm,
    onDelete: handleDelete,
    canNew: !isSaving,
    canSave: !isSaving,
    canDelete: Boolean(selectedId) && !isSaving,
  });

  useEffect(() => {
    openWindow();
    void loadCodes();
  }, [loadCodes, openWindow]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const codes = await electronService.getAllCodes();
      const stamp = new Date().toISOString().slice(0, 10);
      await saveTextFileWithDialog(`codes-${stamp}.csv`, codesToCsv(codes), t('export.codeTitle'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportXlsx = async () => {
    setExporting(true);
    try {
      const codes = await electronService.getAllCodes();
      const stamp = new Date().toISOString().slice(0, 10);
      await saveBinaryFileWithDialog(
        `codes-${stamp}.xlsx`,
        await codesToXlsxBase64(codes),
        t('code.exportXlsx'),
      );
    } finally {
      setExporting(false);
    }
  };

  if (!isWindowOpen) {
    return (
      <div className="flex h-full items-center justify-center bg-[#808080] p-4">
        <div className="win-dialog-panel text-center">
          <p className="text-sm text-content">{t('code.windowClosed')}</p>
          <button type="button" className="win-button mt-3" onClick={openWindow}>
            {t('code.openWindow')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-start justify-center bg-[#808080] p-3">
      <div className="win-dialog-window flex h-full max-h-full w-full max-w-4xl flex-col shadow-[2px_2px_6px_rgba(0,0,0,0.45)]">
        <div className="win-titlebar flex items-center justify-between">
          <span>{t('code.title', { version: CODE_WINDOW_VERSION })}</span>
          <div className="flex gap-1">
            <button
              type="button"
              className="win-button text-xs"
              onClick={() => setImportOpen(true)}
            >
              {t('code.import')}
            </button>
            <button
              type="button"
              className="win-button text-xs"
              onClick={() => void handleExport()}
              disabled={exporting}
            >
              {t('code.export')}
            </button>
            <button
              type="button"
              className="win-button text-xs"
              onClick={() => void handleExportXlsx()}
              disabled={exporting}
            >
              {t('code.exportXlsx')}
            </button>
          </div>
        </div>

        <CodeRegistrationForm />

        <CodeRegistrationGrid />

        <div className="win-statusbar flex min-h-[28px] items-center justify-between px-2 py-1 leading-normal">
          <span>{statusMessage}</span>
          <div className="flex items-center gap-3">
            {isDirty && <span className="text-status-warning">{t('common.dirty')}</span>}
            <span>{t('common.recordCount', { count: recordCount })}</span>
          </div>
        </div>
      </div>
      <CodeImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void loadCodes()}
      />
    </div>
  );
}
