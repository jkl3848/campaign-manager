import { useEffect } from 'react';
import type { DiceRoll } from '../../types';
import { D12Die } from './D12Die';

interface RollAlertProps {
  roll: DiceRoll | null;
  onDismiss: () => void;
}

export function RollAlert({ roll, onDismiss }: RollAlertProps) {
  useEffect(() => {
    if (!roll) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [roll, onDismiss]);

  if (!roll) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-50 flex justify-center px-4">
      <div
        className="pointer-events-auto w-full max-w-sm animate-popup-in rounded-xl border border-amber-600/40 bg-slate-950/95 px-5 py-4 shadow-2xl shadow-amber-900/30 backdrop-blur-md"
        onClick={onDismiss}
      >
        <div className="mb-3 text-center">
          <p className="font-serif text-sm font-bold text-amber-200">{roll.rollerName}</p>
          {roll.label && <p className="text-xs text-slate-400">{roll.label}</p>}
          {roll.secret && (
            <p className="text-[10px] uppercase tracking-wider text-purple-400/80">Secret roll</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-6">
          <D12Die value={roll.white} color="white" size="sm" />
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-400">{roll.total}</p>
            {roll.modifier !== 0 && (
              <p className="text-xs text-slate-500">
                {roll.white} + {roll.black} {roll.modifier > 0 ? '+' : ''}
                {roll.modifier}
              </p>
            )}
          </div>
          <D12Die value={roll.black} color="black" size="sm" />
        </div>

        <div className="mt-3 flex items-center justify-center gap-3 text-xs">
          {roll.isCrit && <span className="font-bold text-red-400 animate-pulse">CRITICAL!</span>}
          {roll.hopeGain === 'player' && <span className="text-sky-400">+1 Hope</span>}
          {roll.hopeGain === 'dm' && <span className="text-purple-400">+1 Fear</span>}
        </div>
      </div>
    </div>
  );
}
