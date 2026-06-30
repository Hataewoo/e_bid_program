import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/app/stores';
import { useI18n } from '@/i18n/use-i18n';
import type { I18nStatus } from '@/i18n/i18n-status';
import { translate } from '@/i18n/translate';
import type { ParseResult, ParsedMasterRow } from '@/shared/utils/dataParser';
import { dedupeMasterRows, parseMasterDataFile, readFileAsText } from '@/shared/utils/dataParser';
import { parseMasterXlsx, readFileAsArrayBuffer } from '@/shared/utils/xlsxImport';
import { bulkImportMasters } from '../services/data-import-service';
import { useBulkImportRefresh } from '../hooks/use-bulk-import-refresh';

type ImportPhase = 'idle' | 'preview' | 'importing' | 'done' | 'error';

interface DataImportModalProps {
  open: boolean;
  onClose: () => void;
}

const ACCEPT =
  '.txt,.csv,.xlsx,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function DataImportModal({ open, onClose }: DataImportModalProps) {
  const { t } = useI18n();
  const refreshStores = useBulkImportRefresh();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processGenRef = useRef(0);

  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [fileName, setFileName] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedMasterRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusMessage, setStatusMessage] = useState<I18nStatus>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const resetState = useCallback(() => {
    setPhase('idle');
    setFileName('');
    setParseResult(null);
    setPreviewRows([]);
    setProgress({ current: 0, total: 0 });
    setStatusMessage(null);
    setImportErrors([]);
  }, []);

  const handleClose = useCallback(() => {
    if (phase === 'importing') return;
    resetState();
    onClose();
  }, [phase, resetState, onClose]);

  const processFile = useCallback(async (file: File) => {
    const gen = ++processGenRef.current;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.txt') && !lower.endsWith('.csv') && !lower.endsWith('.xlsx')) {
      if (gen !== processGenRef.current) return;
      setPhase('error');
      setStatusMessage({ key: 'admin.import.unsupportedFormat' });
      return;
    }

    try {
      let parsed: ParseResult;
      if (lower.endsWith('.xlsx')) {
        const buffer = await readFileAsArrayBuffer(file);
        parsed = await parseMasterXlsx(buffer, file.name);
      } else {
        const content = await readFileAsText(file);
        parsed = parseMasterDataFile(file.name, content);
      }
      if (gen !== processGenRef.current) return;
      const rows = dedupeMasterRows(parsed.rows);

      setFileName(file.name);
      setParseResult(parsed);
      setPreviewRows(rows);
      setPhase(rows.length > 0 ? 'preview' : 'error');
      setStatusMessage(
        rows.length > 0
          ? {
              key: 'admin.import.parseDone',
              params: {
                format: parsed.format.toUpperCase(),
                count: String(rows.length),
                errors: String(parsed.errors.length),
              },
            }
          : { key: 'admin.import.noValidRows' },
      );
      setImportErrors(parsed.errors.slice(0, 20));
    } catch {
      if (gen !== processGenRef.current) return;
      setPhase('error');
      setStatusMessage({ key: 'admin.import.readFailed' });
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void processFile(file);
      e.target.value = '';
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void processFile(file);
    },
    [processFile],
  );

  const handleApply = useCallback(async () => {
    if (previewRows.length === 0) return;

    const beginBusy = useAppStore.getState().beginBusy;
    const endBusy = useAppStore.getState().endBusy;

    setPhase('importing');
    setProgress({ current: 0, total: previewRows.length });
    setStatusMessage({
      key: 'admin.import.progress',
      params: { current: '0', total: String(previewRows.length) },
    });
    setImportErrors([]);
    beginBusy('admin.import.busyMaster');

    try {
      const result = await bulkImportMasters(previewRows, (p) => {
        setProgress(p);
        setStatusMessage({
          key: 'admin.import.progress',
          params: {
            current: String(p.current),
            total: String(p.total),
          },
        });
      });

      if (result.failed > 0) {
        setImportErrors(result.errors.slice(0, 30));
      }

      if (result.upserted > 0) {
        await refreshStores();
      }

      if (result.success && result.upserted > 0) {
        resetState();
        onClose();
        return;
      }

      setPhase('done');
      setStatusMessage(
        result.success
          ? { key: 'admin.import.doneSuccess', params: { count: String(result.upserted) } }
          : {
              key: 'admin.import.donePartial',
              params: {
                upserted: String(result.upserted),
                failed: String(result.failed),
              },
            },
      );
    } catch {
      setPhase('error');
      setStatusMessage({ key: 'admin.import.applyFailed' });
      useAppStore.getState().setSystemError(translate('error.bulkImportFailed'));
    } finally {
      endBusy();
    }
  }, [previewRows, refreshStores, resetState, onClose]);

  if (!open) return null;

  const progressPct =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const statusText = statusMessage ? t(statusMessage.key, statusMessage.params) : '';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className="win-dialog-window flex max-h-[90vh] w-full max-w-2xl flex-col shadow-lg">
        <div className="win-titlebar flex items-center justify-between">
          <span>{t('admin.import.master.title')}</span>
          <button
            type="button"
            className="win-button text-xs"
            onClick={handleClose}
            disabled={phase === 'importing'}
          >
            {t('common.close')}
          </button>
        </div>

        <div className="space-y-3 overflow-auto p-3">
          <div
            className={`flex min-h-[100px] flex-col items-center justify-center border-2 border-dashed p-4 text-center text-sm ${
              dragOver ? 'border-[#000080] bg-[#ffffe0]' : 'border-border bg-[#f0f0f0]'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <p className="text-content-muted">{t('admin.import.dropHint')}</p>
            <p className="mt-1 text-xs text-content-muted">{t('admin.import.masterFormatHint')}</p>
            <button
              type="button"
              className="win-button mt-3"
              onClick={() => fileInputRef.current?.click()}
              disabled={phase === 'importing'}
            >
              {t('admin.import.selectFile')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {fileName ? (
            <div className="border border-border bg-[#ece9d8] px-2 py-1 text-xs">
              {t('admin.import.fileLabel', { name: fileName })}
              {parseResult ? (
                <span className="ml-2 text-content-muted">
                  {t('admin.import.previewMeta', {
                    format: parseResult.format.toUpperCase(),
                    count: String(previewRows.length),
                  })}
                </span>
              ) : null}
            </div>
          ) : null}

          {statusText ? (
            <div className="border border-border bg-[#fffff0] px-2 py-1 text-xs">{statusText}</div>
          ) : null}

          {phase === 'importing' || phase === 'done' ? (
            <div className="space-y-1">
              <div className="h-4 w-full border border-border bg-white">
                <div
                  className="h-full bg-[#000080] transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="text-center text-[10px] text-content-muted">{progressPct}%</div>
            </div>
          ) : null}

          {previewRows.length > 0 && phase !== 'importing' ? (
            <div className="max-h-48 overflow-auto border border-border">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#ece9d8]">
                    <th className="border border-border px-1 py-0.5">No</th>
                    <th className="border border-border px-1 py-0.5">masterNo</th>
                    <th className="border border-border px-1 py-0.5">
                      {t('admin.import.col.valueLength')}
                    </th>
                    <th className="border border-border px-1 py-0.5">memo</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 50).map((row) => (
                    <tr key={row.masterNo} className="bg-white">
                      <td className="border border-border px-1 py-0.5">{row.lineNumber}</td>
                      <td className="border border-border px-1 py-0.5 font-mono">{row.masterNo}</td>
                      <td className="border border-border px-1 py-0.5 font-mono">
                        {t('admin.import.valueDigits', {
                          count: row.masterValue.length.toLocaleString(),
                        })}
                      </td>
                      <td className="border border-border px-1 py-0.5">{row.memo ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRows.length > 50 ? (
                <div className="bg-[#f0f0f0] px-2 py-1 text-[10px] text-content-muted">
                  {t('admin.import.moreRows', { count: String(previewRows.length - 50) })}
                </div>
              ) : null}
            </div>
          ) : null}

          {importErrors.length > 0 ? (
            <div className="max-h-24 overflow-auto border border-border bg-[#fff0f0] p-2 text-[10px] text-[#800000]">
              {importErrors.map((err, index) => (
                <div key={`${index}-${err}`}>{err}</div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-1 border-t border-border bg-[#ece9d8] px-3 py-2">
          <button
            type="button"
            className="win-button"
            onClick={resetState}
            disabled={phase === 'importing' || phase === 'idle'}
          >
            {t('admin.import.reset')}
          </button>
          <button
            type="button"
            className="win-button win-button-primary"
            onClick={() => void handleApply()}
            disabled={phase !== 'preview' || previewRows.length === 0}
          >
            {t('admin.import.applyDb')}
          </button>
        </div>
      </div>
    </div>
  );
}
