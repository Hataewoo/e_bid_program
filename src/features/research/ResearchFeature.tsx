import { useEffect } from 'react';
import { useResearchStore } from './stores/research-store';
import { RESEARCH_TABS } from './types';
import { ExperimentSelector } from './components/ExperimentSelector';
import { ExportToolbar } from './components/ExportToolbar';
import { ExperimentsTab } from './components/tabs/ExperimentsTab';
import { ScreenshotsTab } from './components/tabs/ScreenshotsTab';
import { InputsTab } from './components/tabs/InputsTab';
import { OutputsTab } from './components/tabs/OutputsTab';
import { DifferencesTab } from './components/tabs/DifferencesTab';
import { HypothesesTab } from './components/tabs/HypothesesTab';
import { VerificationTab } from './components/tabs/VerificationTab';
import { TestSuiteTab } from './components/tabs/TestSuiteTab';
import { DashboardTab } from './components/tabs/DashboardTab';
import { useI18n } from '@/i18n/use-i18n';

export function ResearchFeature() {
  const { t } = useI18n();
  const activeTab = useResearchStore((s) => s.activeTab);
  const setActiveTab = useResearchStore((s) => s.setActiveTab);
  const loadAll = useResearchStore((s) => s.loadAll);
  const statusMessage = useResearchStore((s) => s.statusMessage);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  return (
    <div className="win-window flex h-full flex-col">
      <div className="win-titlebar">{t('research.title')}</div>
      <div className="win-toolbar flex items-center justify-between px-3 py-1">
        <div className="flex flex-wrap gap-1">
          {RESEARCH_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`win-button text-xs ${activeTab === tab.id ? 'win-button-primary' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
        <ExportToolbar />
      </div>
      {activeTab !== 'dashboard' &&
        activeTab !== 'experiments' &&
        activeTab !== 'hypotheses' &&
        activeTab !== 'verification' &&
        activeTab !== 'testSuite' && <ExperimentSelector />}
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'experiments' && <ExperimentsTab />}
        {activeTab === 'screenshots' && <ScreenshotsTab />}
        {activeTab === 'inputs' && <InputsTab />}
        {activeTab === 'outputs' && <OutputsTab />}
        {activeTab === 'differences' && <DifferencesTab />}
        {activeTab === 'hypotheses' && <HypothesesTab />}
        {activeTab === 'verification' && <VerificationTab />}
        {activeTab === 'testSuite' && <TestSuiteTab />}
      </div>
      <div className="win-statusbar px-3">{statusMessage}</div>
    </div>
  );
}
