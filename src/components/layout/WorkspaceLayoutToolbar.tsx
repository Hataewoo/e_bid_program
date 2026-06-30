import { useI18n } from '@/i18n/use-i18n';

interface WorkspaceLayoutToolbarProps {
  onReset: () => void;
  toggles?: { label: string; active: boolean; onClick: () => void }[];
}

export function WorkspaceLayoutToolbar({ onReset, toggles = [] }: WorkspaceLayoutToolbarProps) {
  const { t } = useI18n();
  return (
    <div className="win-layout-toolbar flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#404040] bg-[#f0f0f0] px-2 py-1">
      <span className="text-[10px] text-[#404040]">{t('layout.workspaceHint')}</span>
      <div className="flex flex-wrap items-center gap-1">
        {toggles.map((toggle) => (
          <button
            key={toggle.label}
            type="button"
            className={`win-button px-2 text-[10px] ${toggle.active ? 'win-button-primary' : ''}`}
            onClick={toggle.onClick}
          >
            {toggle.label}
          </button>
        ))}
        <button type="button" className="win-button px-2 text-[10px]" onClick={onReset}>
          {t('layout.reset')}
        </button>
      </div>
    </div>
  );
}
