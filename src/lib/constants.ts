export const APP_NAME = 'CS E-Bid Analyzer';

export const APP_ROUTES = {
  master: '/master',
  code: '/code',
  codeValue: '/code-value',
  reverseEngineering: '/reverse-engineering',
  research: '/research',
  analysis: '/analysis',
  statistics: '/statistics',
  settings: '/settings',
} as const;

export const NAV_ITEMS = [
  { id: 'master', label: 'MASTER', path: APP_ROUTES.master },
  { id: 'code', label: 'CODE', path: APP_ROUTES.code },
  { id: 'codeValue', label: 'CodeValue', path: APP_ROUTES.codeValue },
  { id: 'reverseEngineering', label: 'Reverse Engineering', path: APP_ROUTES.reverseEngineering },
  { id: 'research', label: 'Research', path: APP_ROUTES.research },
  { id: 'analysis', label: 'Analysis', path: APP_ROUTES.analysis },
  { id: 'statistics', label: 'Statistics', path: APP_ROUTES.statistics },
  { id: 'settings', label: 'Settings', path: APP_ROUTES.settings },
] as const;
