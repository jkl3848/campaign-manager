import { Popup } from './Popup';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  confirming?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  confirming = false,
}: ConfirmDialogProps) {
  return (
    <Popup open={open} onClose={onClose} title={title} size="sm">
      <p className="font-serif text-sm text-slate-300 mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={confirming}>
          Cancel
        </Button>
        <Button
          variant="danger"
          disabled={confirming}
          onClick={() => void onConfirm()}
        >
          {confirming ? 'Deleting…' : confirmLabel}
        </Button>
      </div>
    </Popup>
  );
}
