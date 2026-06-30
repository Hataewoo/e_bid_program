import { useCallback, useEffect, useState } from 'react';
import { electronService } from '@/services';
import { confirmDanger } from '@/lib/confirm-dialog';
import { useI18n } from '@/i18n/use-i18n';
import type { AnalysisHistory } from '@/types/electron';
import type { AnalysisHistorySummary } from '@/shared/utils/analysisPersistence';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseSummary(result: string | null): AnalysisHistorySummary | null {
  if (!result) return null;
  try {
    return JSON.parse(result) as AnalysisHistorySummary;
  } catch {
    return null;
  }
}

interface AnalysisHistoryPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function AnalysisHistoryPanel({ visible, onClose }: AnalysisHistoryPanelProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<AnalysisHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await electronService.getAnalysisHistories();
      setItems(rows);
      setSelectedId(rows[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void loadHistory();
  }, [visible, loadHistory]);

  const handleClear = async () => {
    if (!(await confirmDanger(t('analysis.history.clearConfirm')))) return;
    await electronService.clearAnalysisHistories();
    await loadHistory();
  };

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const summary = selected ? parseSummary(selected.result) : null;

  if (!visible) return null;

  return (
    <div className="win-debug-console flex max-h-56 min-h-0 shrink-0 flex-col border-t border-[#404040]">
      <div className="flex items-center justify-between border-b border-[#404040] bg-[#ece9d8] px-2 py-1">
        <span className="text-[11px] font-semibold text-[#000080]">
          {t('analysis.history.title')}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            className="win-button px-2 text-[10px]"
            onClick={() => void loadHistory()}
          >
            {t('analysis.history.refresh')}
          </button>
          <button
            type="button"
            className="win-button px-2 text-[10px]"
            onClick={() => void handleClear()}
          >
            {t('analysis.history.clearAll')}
          </button>
          <button type="button" className="win-button px-2 text-[10px]" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto">
          {loading ? (
            <p className="p-3 text-xs text-content-muted">{t('common.loading')}</p>
          ) : items.length === 0 ? (
            <p className="p-3 text-xs text-content-muted">{t('analysis.history.empty')}</p>
          ) : (
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 bg-[#ece9d8]">
                <tr className="border-b border-[#404040]">
                  <th className="px-2 py-1">{t('analysis.history.col.time')}</th>
                  <th className="px-2 py-1">Master</th>
                  <th className="px-2 py-1">{t('analysis.history.col.status')}</th>
                  <th className="px-2 py-1">{t('analysis.history.col.digits')}</th>
                  <th className="px-2 py-1">Low/High</th>
                  <th className="px-2 py-1">Prediction</th>
                  <th className="px-2 py-1">{t('analysis.history.col.source')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const rowSummary = parseSummary(item.result);
                  const isSelected = item.id === selectedId;
                  return (
                    <tr
                      key={item.id}
                      className={`cursor-pointer border-b border-[#c0c0c0] ${
                        isSelected ? 'bg-[#c0c0c0] font-semibold' : 'hover:bg-[#e5f3ff]'
                      }`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td className="px-2 py-0.5">{formatTime(item.analyzedAt)}</td>
                      <td className="px-2 py-0.5">{item.bidNumber ?? '-'}</td>
                      <td className="px-2 py-0.5">{item.status}</td>
                      <td className="px-2 py-0.5">{rowSummary?.totalCount ?? '-'}</td>
                      <td className="px-2 py-0.5">
                        {rowSummary ? `${rowSummary.lowRate}% / ${rowSummary.highRate}%` : '-'}
                      </td>
                      <td className="px-2 py-0.5 font-mono">{rowSummary?.prediction ?? '-'}</td>
                      <td className="px-2 py-0.5">{rowSummary?.source ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {selected ? (
          <div className="w-52 shrink-0 border-l border-[#404040] bg-[#f0f0f0] p-2 text-[10px]">
            <div className="font-semibold text-[#000080]">{t('analysis.history.detail')}</div>
            <div className="mt-1 space-y-1 text-black">
              <div>{selected.title}</div>
              {summary ? (
                <>
                  <div>Runs: {summary.runCount}</div>
                  <div>Max Run: {summary.maxRun}</div>
                  <div>Top Digit: {summary.topDigit ?? '-'}</div>
                  <div>Prediction: {summary.prediction ?? '-'}</div>
                </>
              ) : (
                <div className="break-all">{selected.result ?? '-'}</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
