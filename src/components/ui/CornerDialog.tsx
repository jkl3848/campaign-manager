import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';

interface CornerDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function CornerDialog({ open, onClose, title, children, style }: CornerDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="absolute z-40 w-72 folio rounded-sm animate-popup-in"
      style={style}
    >
      <div className="flex items-center justify-between border-b border-brass/25 px-3 py-2">
        <h3 className="font-display text-base font-semibold tracking-wide text-amber-100">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>
      <div className="px-3 py-3">{children}</div>
    </div>
  );
}
