import { useI18n } from '@/i18n/use-i18n';

export function RouteFallback() {
  const { t } = useI18n();

  return (
    <div className="flex h-full min-h-[12rem] items-center justify-center">
      <div className="rounded border border-border bg-surface-elevated px-4 py-3 text-sm text-content-muted">
        {t('common.loading')}
      </div>
    </div>
  );
}
