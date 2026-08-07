import { memo } from 'react';
import type { AnalysisResult } from '@/shared/utils/analysisEngine';
import { MasterValueTextarea } from '@/components/ui/MasterValueTextarea';
import { useI18n } from '@/i18n/use-i18n';

interface CodeValueStep1PanelProps {
  result: AnalysisResult;
}

/** STEP1 — 레거시 `# Master Value.` 단일 열 */
export const CodeValueStep1Panel = memo(function CodeValueStep1Panel({
  result,
}: CodeValueStep1PanelProps) {
  const { t } = useI18n();

  return (
    <div className="win-legacy-step-shell flex h-full min-h-0 flex-1 flex-col bg-[#f0f0f0] p-px">
      <div className="flex h-full min-h-0 flex-col border border-[#808080] bg-white">
        <div className="win-point-values-header shrink-0 font-semibold text-[#0000ff]">
          {t('codeValue.legacy.step1Header')}
        </div>
        <MasterValueTextarea readOnly value={result.digits} className="min-h-0 flex-1" />
      </div>
    </div>
  );
});
