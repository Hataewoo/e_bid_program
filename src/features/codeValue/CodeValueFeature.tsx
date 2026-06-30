import '@/lib/ag-grid';
import { useState } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import { CodeValueCountFeature } from './CodeValueCountFeature';
import { CodeValueManagementFeature } from './CodeValueManagementFeature';

type CodeValuePageMode = 'count' | 'manage';

export function CodeValueFeature() {
  const { t } = useI18n();
  const [mode, setMode] = useState<CodeValuePageMode>('count');

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#808080]">
      <div className="flex shrink-0 border-b border-[#404040] bg-[#ece9d8]">
        <button
          type="button"
          className={`win-step-tab ${mode === 'count' ? 'win-step-tab-active' : ''}`}
          onClick={() => setMode('count')}
        >
          {t('codeValue.tab.count')}
        </button>
        <button
          type="button"
          className={`win-step-tab ${mode === 'manage' ? 'win-step-tab-active' : ''}`}
          onClick={() => setMode('manage')}
        >
          {t('codeValue.tab.manage')}
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {mode === 'count' ? <CodeValueCountFeature /> : <CodeValueManagementFeature />}
      </div>
    </div>
  );
}
