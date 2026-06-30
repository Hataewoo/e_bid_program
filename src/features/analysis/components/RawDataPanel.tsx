import { memo, useMemo, useState } from 'react';
import type { AnalysisResult } from '@/shared/utils/analysisEngine';
import { useI18n } from '@/i18n/use-i18n';
import type { MessageKey } from '@/i18n/messages';
import {
  compareVerificationSnapshots,
  copyAnalysisResultToClipboard,
  copyVerificationSnapshotToClipboard,
  parseExpectedVerificationJson,
  serializeAnalysisResult,
  serializeVerificationSnapshot,
  toVerificationSnapshot,
  type VerificationDiff,
} from '../utils/analysis-debug';

type RawDataView = 'verify' | 'full' | 'compare';

const RAW_DATA_TABS: { id: RawDataView; labelKey: MessageKey }[] = [
  { id: 'verify', labelKey: 'analysis.rawData.tab.verify' },
  { id: 'full', labelKey: 'analysis.rawData.tab.full' },
  { id: 'compare', labelKey: 'analysis.rawData.tab.compare' },
];

interface RawDataPanelProps {
  result: AnalysisResult | null;
  visible: boolean;
  onClose: () => void;
}

export const RawDataPanel = memo(function RawDataPanel({
  result,
  visible,
  onClose,
}: RawDataPanelProps) {
  const { t } = useI18n();
  const [view, setView] = useState<RawDataView>('verify');
  const [expectedJson, setExpectedJson] = useState('');

  const snapshot = useMemo(() => (result ? toVerificationSnapshot(result) : null), [result]);

  const diffs = useMemo((): VerificationDiff[] => {
    if (!snapshot || view !== 'compare' || !expectedJson.trim()) return [];
    try {
      const expected = parseExpectedVerificationJson(expectedJson);
      return compareVerificationSnapshots(snapshot, expected);
    } catch {
      return [{ path: '(parse)', expected: 'valid JSON', actual: 'parse error' }];
    }
  }, [snapshot, expectedJson, view]);

  const displayText = useMemo(() => {
    if (!result) return t('analysis.rawData.noResult');
    if (view === 'verify' && snapshot) {
      return serializeVerificationSnapshot(snapshot);
    }
    if (view === 'full') {
      const includeDigits = result.digits.length <= 50_000;
      return serializeAnalysisResult(result, {
        includeDigits,
        includeRuns: result.runs.length <= 10_000,
      });
    }
    if (view === 'compare') {
      if (diffs.length === 0) {
        return expectedJson.trim()
          ? t('analysis.rawData.allMatch')
          : t('analysis.rawData.compareHint');
      }
      return diffs
        .map((d) => `${d.path}\n  expected: ${d.expected}\n  actual:   ${d.actual}`)
        .join('\n\n');
    }
    return '';
  }, [result, snapshot, view, diffs, expectedJson, t]);

  const handleCopy = async () => {
    if (!result) return;
    if (view === 'verify') {
      await copyVerificationSnapshotToClipboard(result);
      return;
    }
    await copyAnalysisResultToClipboard(result, {
      includeDigits: result.digits.length <= 100_000,
      includeRuns: false,
    });
  };

  if (!visible) return null;

  return (
    <div className="absolute bottom-10 right-3 z-50 flex w-[min(560px,92vw)] flex-col border border-border bg-surface-elevated shadow-lg">
      <div className="flex items-center justify-between border-b border-border bg-surface-muted px-2 py-1">
        <span className="text-xs font-semibold text-content">{t('analysis.rawData.title')}</span>
        <div className="flex gap-1">
          <button
            type="button"
            className="win-button text-[11px]"
            onClick={() => void handleCopy()}
            disabled={!result}
          >
            {t('analysis.rawData.copy')}
          </button>
          <button type="button" className="win-button text-[11px]" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border bg-[#ece9d8] px-2 py-1">
        {RAW_DATA_TABS.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            className={`win-button text-[10px] ${view === id ? 'win-button-primary' : ''}`}
            onClick={() => setView(id)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {view === 'compare' ? (
        <textarea
          className="max-h-24 w-full resize-none border-b border-border p-2 font-mono text-[10px]"
          placeholder={t('analysis.rawData.placeholder')}
          value={expectedJson}
          onChange={(e) => setExpectedJson(e.target.value)}
          spellCheck={false}
        />
      ) : null}

      <pre className="max-h-72 overflow-auto p-2 font-mono text-[10px] leading-relaxed text-content">
        {displayText}
      </pre>
    </div>
  );
});
