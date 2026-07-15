import { useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/app/stores';
import { PageHeader } from '@/components/ui';
import { NAV_ITEMS } from '@/lib/constants';
import { useSettingsStore } from '@/stores/settings-store';
import { useI18n } from '@/i18n/use-i18n';
import { useWorkspaceLayoutStore } from '@/stores/workspace-layout-store';
import { useDatabaseBackupRestore } from './hooks/use-database-backup-restore';
import { useAppUpdate } from './hooks/use-app-update';
import { FontScaleSettings } from './components/FontScaleSettings';
import { electronService } from '@/services';
import { getAlgorithmVerificationStatus, shouldShowLegacyUnverifiedUi } from '@/shared/utils/algorithmVerificationStatus';
import { LARGE_MASTER_VALUE_THRESHOLD } from '@/shared/constants/analysis-worker';
import { formatAppErrors } from '@/i18n/format-app-errors';

interface SettingsForm {
  autoRefresh: boolean;
  refreshInterval: number;
  language: 'ko' | 'en';
  analysisWorkerEnabled: boolean;
}

export function SettingsFeature() {
  const { t } = useI18n();
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const dbStatus = useAppStore((s) => s.dbStatus);

  const autoRefresh = useSettingsStore((s) => s.autoRefresh);
  const refreshInterval = useSettingsStore((s) => s.refreshInterval);
  const language = useSettingsStore((s) => s.language);
  const analysisWorkerEnabled = useSettingsStore((s) => s.analysisWorkerEnabled);
  const applySettings = useSettingsStore((s) => s.applySettings);
  const navOrder = useWorkspaceLayoutStore((s) => s.navOrder);
  const resetNavLayout = useWorkspaceLayoutStore((s) => s.resetNavLayout);
  const { busy: dbBusy, message: dbMessage, backup, restore } = useDatabaseBackupRestore();
  const {
    enabled: updateEnabled,
    busy: updateBusy,
    message: updateMessage,
    available: updateAvailable,
    downloadPercent,
    downloaded: updateDownloaded,
    check: checkForUpdates,
    download: downloadUpdate,
    install: installUpdate,
  } = useAppUpdate();

  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [logPath, setLogPath] = useState('-');

  const navLabels = useMemo(
    () => navOrder.map((id) => NAV_ITEMS.find((item) => item.id === id)?.label ?? id).join(' → '),
    [navOrder],
  );

  useEffect(() => {
    void electronService.getRuntimeInfo().then((info) => {
      if (info?.logPath) setLogPath(info.logPath);
    });
  }, []);

  const { register, handleSubmit, reset } = useForm<SettingsForm>({
    defaultValues: {
      autoRefresh,
      refreshInterval,
      language,
      analysisWorkerEnabled,
    },
  });

  useEffect(() => {
    reset({ autoRefresh, refreshInterval, language, analysisWorkerEnabled });
  }, [autoRefresh, refreshInterval, language, analysisWorkerEnabled, reset]);

  const [packagingMessage, setPackagingMessage] = useState<string | null>(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthMessage, setHealthMessage] = useState<string | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [healthDetail, setHealthDetail] = useState<string | null>(null);

  const handleVerifyPackaging = async () => {
    setPackagingMessage(null);
    try {
      const result = await electronService.verifyPackaging();
      setPackagingMessage(
        result.ready ? t('settings.packaging.ready') : t('settings.packaging.notReady'),
      );
    } catch {
      setPackagingMessage(t('settings.packaging.notReady'));
    }
  };

  const handleHealthCheck = async () => {
    setHealthBusy(true);
    setHealthMessage(null);
    setHealthOk(null);
    setHealthDetail(null);
    try {
      let report;
      if (electronService.isAvailable()) {
        const op = await electronService.runHealthCheck();
        if (!op.success || !op.data) {
          throw new Error(formatAppErrors(op.errors, 'IPC_HEALTH_CHECK_FAILED'));
        }
        report = op.data;
      } else {
        const codes = await electronService.getAllCodes();
        report = electronService.runHealthCheckLocal(codes);
      }
      setHealthOk(report.ok);
      setHealthMessage(report.ok ? t('settings.health.ok') : t('settings.health.fail'));
      setHealthDetail(
        report.items
          .map((item) => `${item.label}: ${item.ok ? 'OK' : 'FAIL'} (${item.detail ?? '-'})`)
          .join('\n'),
      );
    } catch (error) {
      setHealthOk(false);
      const detail = error instanceof Error ? error.message : String(error);
      setHealthMessage(t('settings.health.fail'));
      setHealthDetail(detail);
    } finally {
      setHealthBusy(false);
    }
  };

  const onSubmit = (values: SettingsForm) => {
    applySettings(values);
    setSavedMessage(t('settings.saved'));
    window.setTimeout(() => setSavedMessage(null), 2500);
  };

  const algorithmStatus = getAlgorithmVerificationStatus();

  const algorithmStateLabel = (state: string) => {
    if (state === 'verified') return t('settings.algorithm.verified');
    if (state === 'partial') return t('settings.algorithm.partial');
    return t('settings.algorithm.unverified');
  };

  return (
    <div>
      <PageHeader title={t('settings.title')} description={t('settings.description')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-content">{t('settings.general')}</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-content-muted">{t('settings.theme')}</label>
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-md border border-border px-3 py-2 text-sm text-content hover:bg-surface-muted"
              >
                {t('settings.theme.current', {
                  mode: theme === 'dark' ? t('settings.theme.dark') : t('settings.theme.light'),
                })}
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm text-content-muted">
                {t('settings.language')}
              </label>
              <select
                {...register('language')}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-content"
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </select>
              <p className="mt-1 text-xs text-content-muted">{t('settings.language.note')}</p>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('autoRefresh')} id="autoRefresh" />
              <label htmlFor="autoRefresh" className="text-sm text-content">
                {t('settings.autoRefresh')}
              </label>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                {...register('analysisWorkerEnabled')}
                id="analysisWorkerEnabled"
              />
              <label htmlFor="analysisWorkerEnabled" className="text-sm text-content">
                {t('settings.analysisWorker')}
                <span className="mt-1 block text-xs text-content-muted">
                  {t('settings.analysisWorkerHint', { threshold: LARGE_MASTER_VALUE_THRESHOLD })}
                </span>
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm text-content-muted">
                {t('settings.refreshInterval')}
              </label>
              <input
                type="number"
                {...register('refreshInterval', { valueAsNumber: true })}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-content"
                min={5}
                max={300}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-content-inverse hover:bg-accent-hover"
              >
                {t('settings.save')}
              </button>
              {savedMessage ? (
                <span className="text-sm text-status-success">{savedMessage}</span>
              ) : null}
            </div>
            {shouldShowLegacyUnverifiedUi() ? (
              <p className="text-xs text-content-muted">{t('settings.prediction.disclaimer')}</p>
            ) : null}
          </form>
        </div>

        <FontScaleSettings />

        {shouldShowLegacyUnverifiedUi() ? (
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-content">
            {t('settings.algorithm.title')}
          </h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-content-muted">{t('settings.algorithm.codeValue')}</dt>
              <dd className="text-content">
                {algorithmStateLabel(algorithmStatus.codeValue)}
                <span className="ml-2 text-xs text-content-muted">
                  ({algorithmStatus.codeValueDetail})
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-content-muted">{t('settings.algorithm.prediction')}</dt>
              <dd className="text-content">
                {algorithmStateLabel(algorithmStatus.prediction)}
                <span className="ml-2 text-xs text-content-muted">
                  ({algorithmStatus.predictionDetail})
                </span>
              </dd>
            </div>
          </dl>
        </div>
        ) : null}

        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-content">{t('settings.db.title')}</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-content-muted">{t('settings.db.status')}</dt>
              <dd className="text-content">
                {dbStatus?.connected ? t('settings.db.connected') : t('settings.db.disconnected')}
              </dd>
            </div>
            <div>
              <dt className="text-content-muted">{t('settings.db.path')}</dt>
              <dd className="break-all text-content">{dbStatus?.path || '-'}</dd>
            </div>
            {!dbStatus?.connected && dbStatus?.error ? (
              <div>
                <dt className="text-content-muted">{t('settings.db.error')}</dt>
                <dd className="break-all text-xs text-status-error">{dbStatus.error}</dd>
              </div>
            ) : null}
            {dbStatus?.tableCounts &&
              Object.entries(dbStatus.tableCounts).map(([table, count]) => (
                <div key={table}>
                  <dt className="text-content-muted">{table}</dt>
                  <dd className="text-content">
                    {t('settings.db.count', { count: String(count) })}
                  </dd>
                </div>
              ))}
          </dl>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <button
              type="button"
              className="win-button"
              onClick={() => void backup()}
              disabled={dbBusy}
            >
              {t('settings.db.backup')}
            </button>
            <button
              type="button"
              className="win-button win-button-danger"
              onClick={() => void restore()}
              disabled={dbBusy}
            >
              {t('settings.db.restore')}
            </button>
          </div>
          {dbMessage ? <p className="mt-2 text-xs text-content-muted">{dbMessage}</p> : null}
          <div className="mt-3 border-t border-border pt-3">
            <dt className="text-content-muted">{t('settings.logPath')}</dt>
            <dd className="break-all text-xs text-content">{logPath}</dd>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-content">{t('settings.menu.title')}</h3>
          <p className="text-sm text-content-muted">{t('settings.menu.hint')}</p>
          <p className="mt-2 rounded border border-border bg-surface-muted px-2 py-1 font-mono text-xs">
            {navLabels}
          </p>
          <button type="button" className="win-button mt-3" onClick={resetNavLayout}>
            {t('settings.menu.reset')}
          </button>

          <h4 className="mb-2 mt-6 text-sm font-semibold text-content">
            {t('settings.shortcuts.title')}
          </h4>
          <ul className="space-y-1 text-xs text-content-muted">
            <li>{t('settings.shortcuts.import')}</li>
            <li>{t('settings.shortcuts.nav')}</li>
            <li>{t('settings.shortcuts.crudNew')}</li>
            <li>{t('settings.shortcuts.crudSave')}</li>
            <li>{t('settings.shortcuts.crudDelete')}</li>
          </ul>
        </div>

        <div className="card lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-content">{t('settings.health.title')}</h3>
          <p className="text-sm text-content-muted">{t('settings.health.hint')}</p>
          <button
            type="button"
            className="win-button mt-3"
            onClick={() => void handleHealthCheck()}
            disabled={healthBusy}
          >
            {t('settings.health.run')}
          </button>
          {healthMessage ? (
            <p className={`mt-2 text-xs ${healthOk ? 'text-status-success' : 'text-status-error'}`}>
              {healthMessage}
            </p>
          ) : null}
          {healthDetail ? (
            <pre className="mt-2 whitespace-pre-wrap rounded border border-border bg-surface-muted p-2 font-mono text-xs text-content">
              {healthDetail}
            </pre>
          ) : null}
        </div>

        <div className="card lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-content">{t('settings.update.title')}</h3>
          <p className="text-sm text-content-muted">{t('settings.update.hint')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="win-button"
              onClick={() => void checkForUpdates()}
              disabled={updateBusy}
            >
              {t('settings.update.check')}
            </button>
            {updateAvailable ? (
              <button
                type="button"
                className="win-button"
                onClick={() => void downloadUpdate()}
                disabled={updateBusy || updateDownloaded}
              >
                {t('settings.update.download')}
              </button>
            ) : null}
            {updateDownloaded ? (
              <button
                type="button"
                className="win-button win-button-primary"
                onClick={installUpdate}
                disabled={updateBusy}
              >
                {t('settings.update.install')}
              </button>
            ) : null}
          </div>
          {!updateEnabled ? (
            <p className="mt-2 text-xs text-content-muted">{t('settings.update.devOnly')}</p>
          ) : null}
          {updateMessage ? (
            <p className="mt-2 text-xs text-content-muted">{updateMessage}</p>
          ) : null}
          {downloadPercent != null && updateBusy && !updateDownloaded ? (
            <p className="mt-1 text-xs text-content-muted">
              {t('settings.update.progress', { percent: Math.round(downloadPercent) })}
            </p>
          ) : null}
          {updateAvailable?.releaseNotes ? (
            <pre className="mt-2 whitespace-pre-wrap rounded border border-border bg-surface-muted p-2 text-xs text-content">
              {updateAvailable.releaseNotes}
            </pre>
          ) : null}
        </div>

        <div className="card lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-content">
            {t('settings.packaging.title')}
          </h3>
          <p className="text-sm text-content-muted">{t('settings.packaging.hint')}</p>
          <p className="mt-2 font-mono text-xs text-content">{t('settings.packaging.command')}</p>
          <button
            type="button"
            className="win-button mt-3"
            onClick={() => void handleVerifyPackaging()}
          >
            {t('settings.packaging.verify')}
          </button>
          {packagingMessage ? (
            <p className="mt-2 text-xs text-content-muted">{packagingMessage}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
