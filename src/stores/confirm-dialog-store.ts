import { create } from 'zustand';

export type ConfirmDialogVariant = 'default' | 'danger';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
}

interface ConfirmDialogState {
  isOpen: boolean;
  options: ConfirmDialogOptions | null;
  resolve: ((value: boolean) => void) | null;
  request: (options: ConfirmDialogOptions) => Promise<boolean>;
  confirm: () => void;
  cancel: () => void;
}

export const useConfirmDialogStore = create<ConfirmDialogState>((set, get) => ({
  isOpen: false,
  options: null,
  resolve: null,

  request: (options) =>
    new Promise<boolean>((resolve) => {
      set({ isOpen: true, options, resolve });
    }),

  confirm: () => {
    const { resolve } = get();
    resolve?.(true);
    set({ isOpen: false, options: null, resolve: null });
  },

  cancel: () => {
    const { resolve } = get();
    resolve?.(false);
    set({ isOpen: false, options: null, resolve: null });
  },
}));
