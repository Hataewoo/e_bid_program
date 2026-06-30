import { createHashRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts';
import { APP_ROUTES } from '@/lib/constants';
import { lazyPage } from './lazy-page';

const MasterPage = lazyPage(() => import('@/pages/MasterPage'), 'MasterPage');
const CodePage = lazyPage(() => import('@/pages/CodePage'), 'CodePage');
const CodeValuePage = lazyPage(() => import('@/pages/CodeValuePage'), 'CodeValuePage');
const ReverseEngineeringPage = lazyPage(
  () => import('@/pages/ReverseEngineeringPage'),
  'ReverseEngineeringPage',
);
const ResearchPage = lazyPage(() => import('@/pages/ResearchPage'), 'ResearchPage');
const AnalysisPage = lazyPage(() => import('@/pages/AnalysisPage'), 'AnalysisPage');
const StatisticsPage = lazyPage(() => import('@/pages/StatisticsPage'), 'StatisticsPage');
const SettingsPage = lazyPage(() => import('@/pages/SettingsPage'), 'SettingsPage');

export const router = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to={APP_ROUTES.master} replace /> },
      { path: APP_ROUTES.master, element: <MasterPage /> },
      { path: APP_ROUTES.code, element: <CodePage /> },
      { path: APP_ROUTES.codeValue, element: <CodeValuePage /> },
      { path: APP_ROUTES.reverseEngineering, element: <ReverseEngineeringPage /> },
      { path: APP_ROUTES.research, element: <ResearchPage /> },
      { path: '/algorithm-research', element: <Navigate to={APP_ROUTES.research} replace /> },
      { path: APP_ROUTES.analysis, element: <AnalysisPage /> },
      { path: APP_ROUTES.statistics, element: <StatisticsPage /> },
      { path: APP_ROUTES.settings, element: <SettingsPage /> },
    ],
  },
]);
