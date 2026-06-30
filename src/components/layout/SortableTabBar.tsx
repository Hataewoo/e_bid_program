import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useI18n } from '@/i18n/use-i18n';

export interface SortableTabItem {
  id: string;
  label: string;
}

interface SortableTabBarProps {
  items: SortableTabItem[];
  activeId: string;
  onReorder: (ids: string[]) => void;
  onSelect: (id: string) => void;
  className?: string;
}

function SortableTab({
  id,
  label,
  isActive,
  onSelect,
}: {
  id: string;
  label: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      className={`win-step-tab flex items-center gap-1 ${isActive ? 'win-step-tab-active' : ''} ${
        isDragging ? 'win-step-tab-dragging' : ''
      }`}
      onClick={onSelect}
      title={label}
    >
      <span
        className="win-drag-handle shrink-0"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        title={t('layout.dragTab')}
        aria-label={t('layout.dragTabAria')}
      >
        ⋮⋮
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export function SortableTabBar({
  items,
  activeId,
  onReorder,
  onSelect,
  className = '',
}: SortableTabBarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(
      items.map((t) => t.id),
      oldIndex,
      newIndex,
    );
    onReorder(reordered);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
        <div className={`flex shrink-0 border-b border-[#404040] bg-[#ece9d8] ${className}`}>
          {items.map((tab) => (
            <SortableTab
              key={tab.id}
              id={tab.id}
              label={tab.label}
              isActive={tab.id === activeId}
              onSelect={() => onSelect(tab.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
