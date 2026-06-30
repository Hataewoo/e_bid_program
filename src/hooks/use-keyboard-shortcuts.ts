import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '@/lib/constants';
import { useWorkspaceLayoutStore, type NavItemId } from '@/stores/workspace-layout-store';

const OPEN_IMPORT_EVENT = 'csebid:open-import';

export function dispatchOpenImportModal(): void {
  window.dispatchEvent(new CustomEvent(OPEN_IMPORT_EVENT));
}

export function useKeyboardShortcuts(): void {
  const navigate = useNavigate();
  const navOrder = useWorkspaceLayoutStore((s) => s.navOrder);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        dispatchOpenImportModal();
        return;
      }

      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      const digit = Number(event.key);
      if (!Number.isInteger(digit) || digit < 1 || digit > navOrder.length) return;

      event.preventDefault();
      const navId = navOrder[digit - 1] as NavItemId | undefined;
      const item = NAV_ITEMS.find((entry) => entry.id === navId);
      if (item) navigate(item.path);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, navOrder]);
}

export function useOpenImportShortcut(onOpen: () => void): void {
  useEffect(() => {
    const handler = () => onOpen();
    window.addEventListener(OPEN_IMPORT_EVENT, handler);
    return () => window.removeEventListener(OPEN_IMPORT_EVENT, handler);
  }, [onOpen]);
}
