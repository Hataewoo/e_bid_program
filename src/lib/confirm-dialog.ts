import { translate } from '@/i18n/translate';
import {
  useConfirmDialogStore,
  type ConfirmDialogOptions,
  type ConfirmDialogVariant,
} from '@/stores/confirm-dialog-store';

export async function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return useConfirmDialogStore.getState().request({
    confirmLabel: translate('confirm.ok'),
    cancelLabel: translate('confirm.cancel'),
    variant: 'default',
    ...options,
  });
}

export async function confirmDanger(
  message: string,
  options?: {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmDialogVariant;
  },
): Promise<boolean> {
  return confirmDialog({
    title: options?.title ?? translate('confirm.title'),
    message,
    confirmLabel: options?.confirmLabel ?? translate('confirm.ok'),
    cancelLabel: options?.cancelLabel ?? translate('confirm.cancel'),
    variant: options?.variant ?? 'danger',
  });
}
