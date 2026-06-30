import { useAppStore } from '../stores';
import { useI18n } from '@/i18n/use-i18n';

export function GlobalSystemBar() {
  const { t } = useI18n();
  const systemError = useAppStore((s) => s.systemError);
  const clearSystemError = useAppStore((s) => s.clearSystemError);

  if (!systemError) return null;

  return (
    <div className="win-statusbar flex shrink-0 items-center justify-between border-t border-[#800000] bg-[#fff0f0] px-3 text-[#cc0000]">
      <span className="truncate text-xs font-semibold">{systemError}</span>
      <button
        type="button"
        className="win-button ml-2 shrink-0 px-2 py-0 text-[10px]"
        onClick={clearSystemError}
      >
        {t('common.close')}
      </button>
    </div>
  );
}
