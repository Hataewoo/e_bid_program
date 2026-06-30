import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/use-i18n';
import type { MessageKey } from '@/i18n/messages';
import { type NavItemId, useWorkspaceLayoutStore } from '@/stores/workspace-layout-store';

const NAV_LABEL_KEYS: Record<NavItemId, MessageKey> = {
  master: 'nav.master',
  code: 'nav.code',
  codeValue: 'nav.codeValue',
  reverseEngineering: 'nav.reverseEngineering',
  research: 'nav.research',
  analysis: 'nav.analysis',
  statistics: 'nav.statistics',
  settings: 'nav.settings',
};

function SortableNavItem({ id, path }: { id: NavItemId; path: string }) {
  const { t } = useI18n();
  const label = t(NAV_LABEL_KEYS[id]);
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
      className={cn('flex items-center gap-0.5', isDragging && 'opacity-70')}
    >
      <button
        type="button"
        className="win-drag-handle shrink-0 px-1"
        {...attributes}
        {...listeners}
        title={t('sidebar.hint')}
        aria-label={t('sidebar.hint')}
      >
        ⋮⋮
      </button>
      <NavLink
        to={path}
        className={({ isActive }) =>
          cn('sidebar-link min-w-0 flex-1', isActive && 'sidebar-link-active')
        }
      >
        {label}
      </NavLink>
    </div>
  );
}

export function Sidebar() {
  const { t } = useI18n();
  const navOrder = useWorkspaceLayoutStore((s) => s.navOrder);
  const sidebarCollapsed = useWorkspaceLayoutStore((s) => s.sidebarCollapsed);
  const setNavOrder = useWorkspaceLayoutStore((s) => s.setNavOrder);
  const toggleSidebarCollapsed = useWorkspaceLayoutStore((s) => s.toggleSidebarCollapsed);
  const resetNavLayout = useWorkspaceLayoutStore((s) => s.resetNavLayout);

  const navItems = useMemo(
    () =>
      navOrder
        .map((id) => NAV_ITEMS.find((item) => item.id === id))
        .filter((item): item is (typeof NAV_ITEMS)[number] => item != null),
    [navOrder],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = navOrder.indexOf(active.id as NavItemId);
    const newIndex = navOrder.indexOf(over.id as NavItemId);
    if (oldIndex < 0 || newIndex < 0) return;

    setNavOrder(arrayMove(navOrder, oldIndex, newIndex));
  };

  if (sidebarCollapsed) {
    return (
      <aside className="flex w-8 shrink-0 flex-col border-r border-border bg-surface-elevated">
        <button
          type="button"
          className="win-button m-1 min-w-0 px-1 text-[10px]"
          onClick={toggleSidebarCollapsed}
          title={t('sidebar.expand')}
        >
          »
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface-elevated">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
          {t('sidebar.menu')}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            className="win-button min-w-0 px-1.5 text-[9px]"
            onClick={resetNavLayout}
            title={t('sidebar.resetOrder')}
          >
            ↺
          </button>
          <button
            type="button"
            className="win-button min-w-0 px-1.5 text-[9px]"
            onClick={toggleSidebarCollapsed}
            title={t('sidebar.collapse')}
          >
            «
          </button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={navOrder} strategy={verticalListSortingStrategy}>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {navItems.map((item) => (
              <SortableNavItem key={item.id} id={item.id} path={item.path} />
            ))}
          </nav>
        </SortableContext>
      </DndContext>
      <p className="border-t border-border px-3 py-2 text-[9px] leading-tight text-content-muted">
        {t('sidebar.hint')}
      </p>
    </aside>
  );
}
