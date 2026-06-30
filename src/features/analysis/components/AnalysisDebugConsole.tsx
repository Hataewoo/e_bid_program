import { memo, useCallback, useMemo, useState } from 'react';
import type { AnalysisResult } from '@/shared/utils/analysisEngine';
import { useI18n } from '@/i18n/use-i18n';
import {
  copyVerificationSnapshotToClipboard,
  serializeAnalysisResult,
} from '../utils/analysis-debug';

interface AnalysisDebugConsoleProps {
  result: AnalysisResult;
  visible: boolean;
  onClose: () => void;
}

export const AnalysisDebugConsole = memo(function AnalysisDebugConsole({
  result,
  visible,
  onClose,
}: AnalysisDebugConsoleProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const jsonText = useMemo(
    () =>
      serializeAnalysisResult(result, {
        includeDigits: result.digits.length <= 80_000,
        includeRuns: result.runs.length <= 20_000,
      }),
    [result],
  );

  const handleCopy = useCallback(async () => {
    const ok = await copyVerificationSnapshotToClipboard(result);
    if (!ok) {
      await navigator.clipboard.writeText(jsonText);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [result, jsonText]);

  if (!visible) return null;

  return (
    <div className="win-debug-console absolute bottom-2 right-2 z-40 flex w-[min(420px,45vw)] flex-col shadow-lg">
      <div className="flex items-center justify-between border-b border-border bg-[#ece9d8] px-2 py-1">
        <span className="text-xs font-semibold text-[#000080]">
          {t('analysis.debug.title', { no: result.masterNo })}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            className="win-button text-[10px]"
            onClick={() => void handleCopy()}
          >
            {copied ? t('analysis.debug.copied') : t('analysis.debug.copy')}
          </button>
          <button type="button" className="win-button text-[10px]" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
      <pre className="max-h-56 overflow-auto bg-[#fffff0] p-2 font-mono text-[10px] leading-relaxed text-black">
        {jsonText}
      </pre>
      <div className="border-t border-border bg-[#f0f0f0] px-2 py-0.5 text-[9px] text-content-muted">
        {t('analysis.debug.hint')}
      </div>
    </div>
  );
});
