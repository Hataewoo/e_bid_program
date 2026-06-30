/** True when the event target is a text-editing control (skip Delete shortcut). */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object' || !('tagName' in target)) return false;
  const el = target as HTMLElement;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return Boolean(el.isContentEditable);
}

export type CrudShortcutAction = 'new' | 'save' | 'delete';

/** Map a keydown event to a CRUD shortcut action, or null if none matched. */
export function matchCrudShortcut(event: KeyboardEvent): CrudShortcutAction | null {
  if (event.defaultPrevented) return null;

  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
    return 'save';
  }

  if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key === 'F2') {
    return 'new';
  }

  if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key === 'Delete') {
    if (isEditableTarget(event.target)) return null;
    return 'delete';
  }

  return null;
}
