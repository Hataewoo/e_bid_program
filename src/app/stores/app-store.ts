import { create } from 'zustand';
import type { MessageKey } from '@/i18n/messages';
import type { ThemeMode } from '@/types';
import type { DbStatus } from '@/types/electron';

interface AppState {
  theme: ThemeMode;
  version: string;
  dbStatus: DbStatus | null;
  isLoading: boolean;
  busyDepth: number;
  busyMessageKey: MessageKey | null;
  systemError: string | null;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setVersion: (version: string) => void;
  setDbStatus: (status: DbStatus) => void;
  setLoading: (loading: boolean) => void;
  beginBusy: (messageKey: MessageKey) => void;
  endBusy: () => void;
  setSystemError: (message: string | null) => void;
  clearSystemError: () => void;
  pushAlert: (message: string) => void;
}

const getInitialTheme = (): ThemeMode => {
  const stored = localStorage.getItem('theme') as ThemeMode | null;
  return stored ?? 'dark';
};

export const useAppStore = create<AppState>((set, get) => ({
  theme: getInitialTheme(),
  version: '1.0.0',
  dbStatus: null,
  isLoading: false,
  busyDepth: 0,
  busyMessageKey: null,
  systemError: null,

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setVersion: (version) => set({ version }),
  setDbStatus: (dbStatus) => set({ dbStatus }),
  setLoading: (isLoading) => set({ isLoading }),

  beginBusy: (messageKey) => {
    set((state) => ({
      busyDepth: state.busyDepth + 1,
      busyMessageKey: messageKey,
    }));
  },

  endBusy: () => {
    set((state) => {
      const nextDepth = Math.max(0, state.busyDepth - 1);
      return {
        busyDepth: nextDepth,
        busyMessageKey: nextDepth > 0 ? state.busyMessageKey : null,
      };
    });
  },

  setSystemError: (message) => set({ systemError: message }),

  clearSystemError: () => set({ systemError: null }),

  pushAlert: (message) => {
    set({ systemError: message });
  },
}));
