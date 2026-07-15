import { useMemo } from 'react';
import { ResizableVerticalSplitter } from '@/components/layout/ResizableVerticalSplitter';
import { MasterValueTextarea } from '@/components/ui/MasterValueTextarea';
import { CodeValueStatsGrid } from '@/features/analysis/components/CodeValueStatsGrid';
import { PatternValuesTable } from '@/features/analysis/components/PatternValuesTable';
import { HIGH_PATTERN_ROWS, LOW_PATTERN_ROWS } from '@/features/analysis/types/pattern-rows';
import { filterDigitsByClass } from '@/features/analysis/utils/analysis-display';
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
    () => (displayResult ? filterDigitsByClass(displayResult.digits, 'low') : ''),
    [displayResult],
  );

  const highText = useMemo(
    () => (displayResult ? filterDigitsByClass(displayResult.digits, 'high') : ''),
    [displayResult],
  );

  const renderStepBody = (step: CodeValueStepId) => {
    if (!displayResult || displayResult.totalCount === 0) {
      return (
        <div className="flex h-full flex-1 items-center justify-center p-6 text-sm text-content-muted">
          {t('codeValue.analysis.noData', { no: selectedMasterNo })}
        </div>
      );
    }

    switch (step) {
      case '1':
        return (
          <div className="flex h-full min-h-0 flex-1 flex-col gap-2 p-2">
            <div className="win-panel shrink-0 border border-[#404040] bg-[#ffffe0] p-2 text-sm text-black">
              <div>
                <span className="font-semibold">{t('codeValue.analysis.masterNo')} </span>
                {displayResult.masterNo}
              </div>
              <div>
                <span className="font-semibold">{t('codeValue.analysis.totalDigits')} </span>
                {t('codeValue.analysis.unitCount', { count: displayResult.totalCount })}
              </div>
            </div>
            <ResizableVerticalSplitter
              storageKey="codevalue-step1-vertical"
              defaultTopPercent={72}
              minTopPercent={20}
              minBottomPercent={12}
              top={
                <MasterValueTextarea
                  readOnly
                  value={displayResult.digits}
                  className="h-full min-h-0"
                />
              }
              bottom={
                <div className="flex h-full min-h-0 flex-col">
                  <CodeValueStatsGrid rows={codeValueStats} loading={loading} />
                </div>
              }
            />
          </div>
        );
      case '2':
        return (
          <div className="flex h-full min-h-0 flex-1 flex-col">
            <MasterValueTextarea readOnly value={lowText} className="min-h-0 flex-1" />
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
          <div className="flex h-full min-h-0 flex-1 flex-col">
            <MasterValueTextarea readOnly value={highText} className="min-h-0 flex-1" />
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f0f0f0] p-2">
      <div className="win-panel flex h-full min-h-0 flex-1 flex-col overflow-hidden border border-border">
        <div className="win-panel-header shrink-0">{t(CODE_VALUE_STEP_LABEL_KEYS[activeStep])}</div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{renderStepBody(activeStep)}</div>
      </div>
    </div>
  );
}
