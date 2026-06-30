import { ConfirmDialog } from './ConfirmDialog';
import { useConfirmDialogStore } from '@/stores/confirm-dialog-store';

export function GlobalConfirmDialog() {
  const isOpen = useConfirmDialogStore((s) => s.isOpen);
  const options = useConfirmDialogStore((s) => s.options);
  const confirm = useConfirmDialogStore((s) => s.confirm);
  const cancel = useConfirmDialogStore((s) => s.cancel);

  if (!isOpen || !options) return null;

  return <ConfirmDialog open={isOpen} options={options} onConfirm={confirm} onCancel={cancel} />;
}
