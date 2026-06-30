import { useMemo } from 'react';
import { CodeValueStatsGrid } from '@/features/analysis/components/CodeValueStatsGrid';
import { PatternValuesTable } from '@/features/analysis/components/PatternValuesTable';
import { HIGH_PATTERN_ROWS, LOW_PATTERN_ROWS } from '@/features/analysis/types/pattern-rows';
import { chunkDigits, filterDigitsByClass } from '@/features/analysis/utils/analysis-display';
import { useI18n } from '@/i18n/use-i18n';
import type { MessageKey } from '@/i18n/messages';
import { type CodeValueStepId, useWorkspaceLayoutStore } from '@/stores/workspace-layout-store';
import { useCodeValueAnalysisStore } from '../stores/code-value-analysis-store';

const CODE_VALUE_STEP_LABEL_KEYS: Record<CodeValueStepId, MessageKey> = {
  '1': 'analysis.step.step1',
  '2': 'analysis.step.step2',
  '3': 'analysis.step.step3',
};

export function StepSectionContent() {
  const { t } = useI18n();
  const activeStep = useWorkspaceLayoutStore((s) => s.codeValueActiveStep);
  const result = useCodeValueAnalysisStore((s) => s.result);
  const codeValueStats = useCodeValueAnalysisStore((s) => s.codeValueStats);
  const loading = useCodeValueAnalysisStore((s) => s.loading);
  const selectedMasterNo = useCodeValueAnalysisStore((s) => s.selectedMasterNo);

  const displayResult = result ?? null;

  const lowText = useMemo(
    () => (displayResult ? chunkDigits(filterDigitsByClass(displayResult.digits, 'low'), 60) : ''),
    [displayResult],
  );

  const highText = useMemo(
    () => (displayResult ? chunkDigits(filterDigitsByClass(displayResult.digits, 'high'), 60) : ''),
    [displayResult],
  );

  const renderStepBody = (step: CodeValueStepId) => {
    if (!displayResult || displayResult.totalCount === 0) {
      return (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-content-muted">
          {t('codeValue.analysis.noData', { no: selectedMasterNo })}
        </div>
      );
    }

    switch (step) {
      case '1':
        return (
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
            <div className="win-panel shrink-0 border border-[#404040] bg-[#ffffe0] p-2 text-xs text-black">
              <div>
                <span className="font-semibold">{t('codeValue.analysis.masterNo')} </span>
                {displayResult.masterNo}
              </div>
              <div>
                <span className="font-semibold">{t('codeValue.analysis.totalDigits')} </span>
                {t('codeValue.analysis.unitCount', { count: displayResult.totalCount })}
              </div>
            </div>
            <textarea
              readOnly
              className="win-textarea-master min-h-[80px] shrink-0 resize-none border border-[#404040] text-[11px]"
              value={displayResult.digits}
              spellCheck={false}
            />
            <div className="min-h-0 flex-1">
              <CodeValueStatsGrid rows={codeValueStats} loading={loading} />
            </div>
          </div>
        );
      case '2':
        return (
          <div className="flex min-h-0 flex-1 flex-col">
            <textarea
              readOnly
              className="win-textarea-master min-h-[100px] shrink-0 resize-none border-0 text-[11px]"
              value={lowText}
              spellCheck={false}
            />
            <div className="win-pattern-stats-line shrink-0">
              {t('analysis.pattern.statsLine', {
                side: 'Low',
                count: displayResult.lowCount,
                rate: displayResult.lowRate,
              })}
            </div>
            <div className="win-pattern-values-panel min-h-0 flex-1 overflow-auto p-0">
              <PatternValuesTable
                side="low"
                rows={LOW_PATTERN_ROWS}
                patterns={displayResult.lowPatterns}
                activeHighlight={null}
                onOpenModal={() => {}}
                onPatternHighlight={() => {}}
                onPatternPin={() => {}}
              />
            </div>
          </div>
        );
      case '3':
        return (
          <div className="flex min-h-0 flex-1 flex-col">
            <textarea
              readOnly
              className="win-textarea-master min-h-[100px] shrink-0 resize-none border-0 text-[11px]"
              value={highText}
              spellCheck={false}
            />
            <div className="win-pattern-stats-line shrink-0">
              {t('analysis.pattern.statsLine', {
                side: 'High',
                count: displayResult.highCount,
                rate: displayResult.highRate,
              })}
            </div>
            <div className="win-pattern-values-panel min-h-0 flex-1 overflow-auto p-0">
              <PatternValuesTable
                side="high"
                rows={HIGH_PATTERN_ROWS}
                patterns={displayResult.highPatterns}
                activeHighlight={null}
                onOpenModal={() => {}}
                onPatternHighlight={() => {}}
                onPatternPin={() => {}}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f0f0f0] p-3">
      <div className="win-panel flex min-h-0 flex-1 flex-col border border-border">
        <div className="win-panel-header">{t(CODE_VALUE_STEP_LABEL_KEYS[activeStep])}</div>
        {renderStepBody(activeStep)}
      </div>
    </div>
  );
}
