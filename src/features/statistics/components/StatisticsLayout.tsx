import '@/lib/ag-grid';
import { useEffect } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import { translate } from '@/i18n/translate';
import { ResizableSplitter } from '@/components/layout/ResizableSplitter';
import { StatisticsToolbar } from './StatisticsToolbar';
import { StatisticsMasterGrid } from './StatisticsMasterGrid';
import { StatisticsWorkspace } from './StatisticsWorkspace';
import { InformationPanel } from './InformationPanel';
import { StatusConsole } from './StatusConsole';
import { StatisticsStatusBar } from './StatisticsStatusBar';
import { useStatisticsStore } from '../stores/statistics-store';

function CenterRightSplit() {
  return (
    <ResizableSplitter
      defaultLeftWidth={620}
      minLeftWidth={360}
      minRightWidth={180}
      left={<StatisticsWorkspace />}
      right={<InformationPanel />}
    />
  );
}

export function StatisticsLayout() {
  const { t } = useI18n();
  const loadMasters = useStatisticsStore((s) => s.loadMasters);

  useEffect(() => {
    void loadMasters();
    useStatisticsStore.getState().appendLog(translate('statistics.log.waiting'), 'waiting');
  }, [loadMasters]);

  return (
    <div className="win-window flex h-full flex-col">
      <div className="win-titlebar">{t('statistics.title')}</div>
      <StatisticsToolbar />
      <ResizableSplitter
        defaultLeftWidth={260}
        minLeftWidth={200}
        minRightWidth={480}
        left={<StatisticsMasterGrid />}
        right={<CenterRightSplit />}
      />
      <StatusConsole />
      <StatisticsStatusBar />
    </div>
  );
}
