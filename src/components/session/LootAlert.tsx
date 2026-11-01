import { useEffect } from 'react';
import type { LootDrop } from '../../types';

interface LootAlertProps {
  drop: LootDrop | null;
  onDismiss: () => void;
}

export function LootAlert({ drop, onDismiss }: LootAlertProps) {
  useEffect(() => {
    if (!drop) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [drop, onDismiss]);

  if (!drop) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-50 flex justify-center px-4">
      <div
        className="pointer-events-auto w-full max-w-sm animate-popup-in rounded-xl border border-amber-600/40 bg-slate-950/95 px-5 py-4 shadow-2xl shadow-amber-900/30 backdrop-blur-md"
        onClick={onDismiss}
      >
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-amber-400/80">Loot</p>
          <p className="mt-1 font-serif text-lg font-bold text-amber-100">
            {drop.recipientName} received {drop.itemName}
          </p>
          <p className="mt-1 text-xs capitalize text-slate-400">{drop.kind}</p>
        </div>
      </div>
    </div>
  );
}
