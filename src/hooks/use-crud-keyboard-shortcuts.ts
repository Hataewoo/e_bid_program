import { useEffect } from 'react';
import { useConfirmDialogStore } from '@/stores/confirm-dialog-store';
import { matchCrudShortcut } from './keyboard-shortcut-utils';

export interface CrudKeyboardShortcutOptions {
  onNew?: () => void;
  onSave?: () => void | Promise<unknown>;
  onDelete?: () => void | Promise<unknown>;
  enabled?: boolean;
  canNew?: boolean;
  canSave?: boolean;
  canDelete?: boolean;
}

export function useCrudKeyboardShortcuts({
  onNew,
  onSave,
  onDelete,
  enabled = true,
  canNew = true,
  canSave = true,
  canDelete = true,
}: CrudKeyboardShortcutOptions): void {
  useEffect(() => {
    if (!enabled) return undefined;

    const handler = (event: KeyboardEvent) => {
      if (useConfirmDialogStore.getState().isOpen) return;

      const action = matchCrudShortcut(event);
      if (!action) return;

      if (action === 'save') {
        if (!canSave || !onSave) return;
        event.preventDefault();
        void onSave();
        return;
      }

      if (action === 'new') {
        if (!canNew || !onNew) return;
        event.preventDefault();
        onNew();
        return;
      }

      if (action === 'delete') {
        if (!canDelete || !onDelete) return;
        event.preventDefault();
        void onDelete();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, canNew, canSave, canDelete, onNew, onSave, onDelete]);
}
