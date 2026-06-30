import type { ReactNode } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import type { FullAnalysisResult } from '../types/analysis.types';

interface AnalysisStepProps {
  title: string;
  children: ReactNode;
}

function AnalysisStep({ title, children }: AnalysisStepProps) {
  return (
    <div className="border-b border-border pb-3">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">{title}</h4>
      <div className="space-y-1 text-xs">{children}</div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex gap-2">
      <span className="w-36 shrink-0 text-content-muted">{label}</span>
      <span className="font-mono text-content">{value}</span>
    </div>
  );
}

interface AnalysisPanelProps {
  result: FullAnalysisResult | null;
}

export function AnalysisPanel({ result }: AnalysisPanelProps) {
  const { t } = useI18n();

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-content-muted">
        {t('re.analysis.noValue')}
      </div>
    );
  }

  const { step1, step2, step3, step4, step5, step6 } = result;
  const none = t('analysis.pattern.noValues');

  return (
    <div className="h-full overflow-auto p-3">
      <AnalysisStep title={t('re.analysis.step1Title')}>
        <StatRow label={t('analysis.info.totalLength')} value={step1.length} />
        <StatRow label={t('re.analysis.duplicateCount')} value={step1.duplicateCount} />
        <StatRow label={t('re.analysis.consecutiveCount')} value={step1.consecutiveCount} />
        <StatRow label={t('re.analysis.even')} value={`${step1.evenCount} (${step1.evenRatio})`} />
        <StatRow label={t('re.analysis.odd')} value={`${step1.oddCount} (${step1.oddRatio})`} />
        <StatRow label={t('re.analysis.lowPart')} value={`${step1.lowCount} (${step1.lowRatio})`} />
        <StatRow
          label={t('re.analysis.highPart')}
          value={`${step1.highCount} (${step1.highRatio})`}
        />
        <div className="mt-2 grid grid-cols-5 gap-1">
          {Object.entries(step1.frequency).map(([digit, count]) => (
            <div key={digit} className="rounded border border-border px-2 py-1 text-center">
              <div className="text-content-muted">{digit}</div>
              <div className="font-mono font-semibold">{count}</div>
            </div>
          ))}
        </div>
      </AnalysisStep>

      <AnalysisStep title={t('re.analysis.step2Title')}>
        <pre className="win-textarea-master max-h-24 overflow-auto whitespace-pre p-2 text-xs">
          {step2.lowPart || none}
        </pre>
        <StatRow label={t('re.analysis.length')} value={step2.lowPart.length} />
      </AnalysisStep>

      <AnalysisStep title={t('re.analysis.step3Title')}>
        <pre className="win-textarea-master max-h-24 overflow-auto whitespace-pre p-2 text-xs">
          {step3.highPart || none}
        </pre>
        <StatRow label={t('re.analysis.length')} value={step3.highPart.length} />
      </AnalysisStep>

      <AnalysisStep title={t('re.analysis.step4Title')}>
        <div className="flex flex-wrap gap-1">
          {step4.groups.map((group, i) => (
            <span
              key={i}
              className="rounded border border-border bg-surface-muted px-2 py-0.5 font-mono"
            >
              {group}
            </span>
          ))}
        </div>
        <StatRow label={t('re.analysis.groupCount')} value={step4.groups.length} />
      </AnalysisStep>

      <AnalysisStep title={t('re.analysis.step5Title')}>
        <StatRow label={t('re.analysis.rleCounts')} value={`[${step5.rleCounts.join(', ')}]`} />
        <pre className="win-textarea-master max-h-32 overflow-auto whitespace-pre p-2 text-xs">
          {JSON.stringify(step5.rle, null, 2)}
        </pre>
      </AnalysisStep>

      <AnalysisStep title={t('re.analysis.step6Title')}>
        <pre className="win-textarea-master max-h-48 overflow-auto whitespace-pre p-2 text-xs">
          {JSON.stringify(step6, null, 2)}
        </pre>
      </AnalysisStep>
    </div>
  );
}
