import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DataImportModal } from '@/features/admin';
import { useAppStore } from '@/app/stores';
import { APP_ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/use-i18n';
import { useOpenImportShortcut } from '@/hooks/use-keyboard-shortcuts';
import { ProgramInfoModal } from './ProgramInfoModal';
import type { MessageKey } from '@/i18n/messages';

const QUICK_NAV = [
  { id: 'master', labelKey: 'nav.master', path: APP_ROUTES.master },
  { id: 'code', labelKey: 'nav.code', path: APP_ROUTES.code },
  { id: 'codeValue', labelKey: 'nav.codeValue', path: APP_ROUTES.codeValue },
] as const satisfies ReadonlyArray<{ id: string; labelKey: MessageKey; path: string }>;

export function Toolbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [importOpen, setImportOpen] = useState(false);
  const [programInfoOpen, setProgramInfoOpen] = useState(false);
  const openImport = useCallback(() => setImportOpen(true), []);
  useOpenImportShortcut(openImport);
  const version = useAppStore((s) => s.version);
  const dbStatus = useAppStore((s) => s.dbStatus);
  const systemError = useAppStore((s) => s.systemError);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const theme = useAppStore((s) => s.theme);

  const isConnected = dbStatus?.connected ?? false;
  const totalRecords = dbStatus
    ? Object.values(dbStatus.tableCounts).reduce((sum, count) => sum + count, 0)
    : 0;
  const dbLabel = systemError
    ? systemError
    : isConnected
      ? `${t('toolbar.db.connected')} (${totalRecords})`
      : t('toolbar.db.disconnected');

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-elevated px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-content">{t('app.name')}</h1>
        <span className="rounded bg-surface-muted px-2 py-0.5 text-xs text-content-muted">
          v{version}
        </span>

        <div className="ml-2 flex items-center gap-1 border-l border-border pl-4">
          {QUICK_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'win-button min-w-[72px]',
                location.pathname === item.path && 'win-button-primary',
              )}
              onClick={() => navigate(item.path)}
            >
              {t(item.labelKey)}
            </button>
          ))}
          <button
            type="button"
            className="win-button min-w-[120px]"
            onClick={() => setImportOpen(true)}
          >
            {t('toolbar.import')}
          </button>
          <button
            type="button"
            className="win-button min-w-[88px]"
            onClick={() => setProgramInfoOpen(true)}
          >
            {t('toolbar.programInfo')}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full',
              isConnected ? 'bg-status-success' : 'bg-status-error',
            )}
          />
          <span
            className={cn(
              'text-content-muted',
              systemError && 'font-semibold text-status-error',
              !systemError && !isConnected && 'text-status-error',
            )}
          >
            {dbLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
          aria-label={t('toolbar.theme.toggle')}
        >
          {theme === 'dark' ? t('toolbar.theme.light') : t('toolbar.theme.dark')}
        </button>
      </div>

      <DataImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <ProgramInfoModal open={programInfoOpen} onClose={() => setProgramInfoOpen(false)} />
    </header>
  );
}
