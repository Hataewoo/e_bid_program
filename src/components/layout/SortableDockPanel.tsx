import { type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useI18n } from '@/i18n/use-i18n';

interface SortableDockPanelProps {
  id: string;
  title: ReactNode;
  children: ReactNode;
  isFocused?: boolean;
  className?: string;
}

export function SortableDockPanel({
  id,
  title,
  children,
  isFocused = false,
  className = '',
}: SortableDockPanelProps) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex min-h-0 min-w-0 flex-col bg-[#f0f0f0] ${
        isFocused ? 'win-dock-panel-focused' : ''
      } ${isDragging ? 'win-dock-panel-dragging' : ''} ${className}`}
    >
      <div className="win-dock-panel-header flex shrink-0 items-center gap-1 border-b border-[#404040] bg-[#ece9d8] px-1 py-px text-[11px] font-semibold text-[#0000ff]">
        <button
          type="button"
          className="win-drag-handle shrink-0"
          {...attributes}
          {...listeners}
          title={t('layout.dragPanel')}
          aria-label={t('layout.dragPanelAria')}
        >
          ⋮⋮
        </button>
        <div className="min-w-0 flex-1 truncate">{title}</div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
