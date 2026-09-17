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
    <div className="pointer-events-none fixed inset-0 z-50 flex justify-end">
      <div className="pointer-events-auto relative flex h-full w-full max-w-md flex-col border-l border-amber-900/40 bg-slate-900 shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4">
          <h2 className="font-serif text-xl font-bold text-amber-100">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t border-slate-700/60 px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
