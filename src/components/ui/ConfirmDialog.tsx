import { useEffect, useRef } from 'react';
import type { ConfirmDialogOptions, ConfirmDialogVariant } from '@/stores/confirm-dialog-store';

interface ConfirmDialogProps {
  open: boolean;
  options: ConfirmDialogOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_CONFIRM_CLASS: Record<ConfirmDialogVariant, string> = {
  default: 'win-button win-button-primary',
  danger: 'win-button win-button-danger',
};

export function ConfirmDialog({ open, options, onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const variant = options.variant ?? 'default';

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="win-dialog-window w-full max-w-md shadow-lg"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="win-titlebar" id="confirm-dialog-title">
          {options.title}
        </div>
        <div className="bg-[#ece9d8] px-4 py-4">
          <p
            id="confirm-dialog-message"
            className="whitespace-pre-wrap text-sm leading-relaxed text-black"
          >
            {options.message}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="win-button" onClick={onCancel}>
              {options.cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              className={VARIANT_CONFIRM_CLASS[variant]}
              onClick={onConfirm}
            >
              {options.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
