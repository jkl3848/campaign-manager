import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';

interface PopupProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-3xl',
};

export function Popup({ open, onClose, title, children, size = 'md' }: PopupProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/70" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} folio rounded-sm animate-popup-in`}>
        <div className="flex items-center justify-between border-b border-brass/25 px-4 py-3">
          <h3 className="font-display text-xl font-semibold tracking-wide text-amber-100">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
