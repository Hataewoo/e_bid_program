import { useAppUpdate } from '@/features/settings/hooks/use-app-update';
import { useI18n } from '@/i18n/use-i18n';

export function GlobalAppUpdateBanner() {
  const { t } = useI18n();
  const {
    enabled,
    busy,
    available,
    downloaded,
    downloadPercent,
    download,
    install,
  } = useAppUpdate();

  if (!enabled || !available) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#000080] bg-[#e8e8ff] px-3 py-1.5">
      <span className="text-xs font-semibold text-[#000080]">
        {t('app.update.banner', {
          current: available.currentVersion,
          latest: available.latestVersion,
        })}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {busy && downloadPercent != null && !downloaded ? (
          <span className="text-[10px] text-[#404040]">
            {t('settings.update.progress', { percent: Math.round(downloadPercent) })}
          </span>
        ) : null}
        {!downloaded ? (
          <button
            type="button"
            className="win-button px-2 py-0.5 text-[10px]"
            onClick={() => void download()}
            disabled={busy}
          >
            {t('settings.update.download')}
          </button>
        ) : (
          <button
            type="button"
            className="win-button win-button-primary px-2 py-0.5 text-[10px]"
            onClick={install}
            disabled={busy}
          >
            {t('settings.update.install')}
          </button>
        )}
      </div>
    </div>
  );
}
