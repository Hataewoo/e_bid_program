import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { RouteFallback } from '@/app/components/RouteFallback';
import { Sidebar, Toolbar } from '@/components/layout';
import {
  useAppInit,
  useDbStatusRefresh,
  useFeatureGridAutoRefresh,
  useKeyboardShortcuts,
} from '@/hooks';
import { useSettingsStore } from '@/stores/settings-store';

export function MainLayout() {
  useAppInit();
  useKeyboardShortcuts();

  const autoRefresh = useSettingsStore((s) => s.autoRefresh);
  const refreshInterval = useSettingsStore((s) => s.refreshInterval);
  const intervalMs = autoRefresh ? refreshInterval * 1000 : 0;

  useDbStatusRefresh(intervalMs);
  useFeatureGridAutoRefresh(intervalMs);

  return (
    <div className="flex h-full flex-col">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-1">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
