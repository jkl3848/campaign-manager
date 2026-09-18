import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function SidePanel({ open, onClose, title, children, footer }: SidePanelProps) {
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
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col paper-sheet rounded-none shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between border-b border-oxblood/30 px-5 py-4">
          <h2 className="font-display text-2xl font-semibold tracking-wide text-oxblood">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-ink-muted hover:text-ink">
            ✕
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 font-serif text-base leading-relaxed text-ink">{children}</div>
        {footer && (
          <div className="border-t border-oxblood/25 px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
