import { useState } from 'react';
import type { Wealth } from '../../types';
import {
  WEALTH_EXCHANGE,
  WEALTH_UNITS,
  applyWealthDelta,
  formatWealth,
  normalizeWealth,
  type WealthUnit,
} from '../../lib/wealth';

interface WealthPanelProps {
  wealth: Wealth;
  canEdit?: boolean;
  compact?: boolean;
  onAdjust?: (unit: WealthUnit, delta: number) => boolean;
}

export function WealthPanel({ wealth, canEdit = false, compact = false, onAdjust }: WealthPanelProps) {
  const current = normalizeWealth(wealth);
  const summary = formatWealth(current);
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<WealthUnit>('coins');
  const [notice, setNotice] = useState<string | null>(null);

  const parsed = /^\d+$/.test(amount) ? Number(amount) : NaN;
  const amountOk = Number.isSafeInteger(parsed) && parsed > 0;
  const canGain = amountOk && applyWealthDelta(current, unit, parsed).ok;
  const canSpend = amountOk && applyWealthDelta(current, unit, -parsed).ok;
  const showControls = canEdit && !!onAdjust;

  const adjust = (nextUnit: WealthUnit, delta: number) => {
    if (!onAdjust) return;
    const ok = onAdjust(nextUnit, delta);
    setNotice(ok ? null : 'Not enough gold.');
  };

  return (
    <div className={compact ? 'pt-2' : undefined}>
      {!compact && (
        <p className="mb-3 font-serif text-sm text-ink">
          {summary === 'No gold' ? 'No gold on hand.' : `Carrying ${summary}.`}
        </p>
      )}

      <div className={`grid grid-cols-2 gap-2 ${compact ? '' : 'sm:grid-cols-4 sm:gap-3'}`}>
        {WEALTH_UNITS.map((entry) => {
          const value = current[entry.id];
          const canRemove = applyWealthDelta(current, entry.id, -1).ok;
          return (
            <div
              key={entry.id}
              className={`border border-ink/15 text-center ${compact ? 'px-1.5 py-1.5' : 'p-3'}`}
            >
              <p
                className={`font-sans font-semibold uppercase tracking-wide text-brass ${
                  compact ? 'text-[10px]' : 'text-xs'
                }`}
              >
                {entry.label}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                {showControls && (
                  <button
                    type="button"
                    onClick={() => adjust(entry.id, -1)}
                    disabled={!canRemove}
                    className="px-1 text-ink-faint hover:text-ink disabled:opacity-30"
                    title={canRemove ? `Spend 1 ${entry.singular}` : 'Not enough gold'}
                  >
                    −
                  </button>
                )}
                <p
                  className={`font-display font-semibold tabular-nums text-ink ${
                    compact ? 'text-lg' : 'text-2xl'
                  }`}
                >
                  {value}
                </p>
                {showControls && (
                  <button
                    type="button"
                    onClick={() => adjust(entry.id, 1)}
                    className="px-1 text-ink-faint hover:text-ink"
                    title={`Gain 1 ${entry.singular}`}
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className={`text-ink-faint ${compact ? 'mt-1.5 text-[10px] leading-snug' : 'mt-2 font-serif text-xs'}`}>
        {WEALTH_EXCHANGE}. Spending breaks a higher unit when a lower one comes up short.
      </p>

      {showControls && (
        <div className={`flex flex-wrap items-center gap-1.5 ${compact ? 'mt-2' : 'mt-3 gap-2'}`}>
          <span
            className={`font-sans font-semibold uppercase tracking-wide text-ink-muted ${
              compact ? 'text-[10px]' : 'text-xs'
            }`}
          >
            Adjust
          </span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Amount of gold"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^\d]/g, ''));
              setNotice(null);
            }}
            className={`border border-ink/25 bg-transparent text-center font-display tabular-nums ${
              compact ? 'w-12 px-1 py-0.5 text-sm' : 'w-16 px-1 py-1 text-base'
            }`}
          />
          <select
            aria-label="Gold unit"
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value as WealthUnit);
              setNotice(null);
            }}
            className={`border border-ink/25 bg-transparent font-sans ${
              compact ? 'px-1 py-0.5 text-[11px]' : 'px-1.5 py-1 text-sm'
            }`}
          >
            {WEALTH_UNITS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => adjust(unit, parsed)}
            disabled={!canGain}
            className="border border-brass/70 px-2.5 py-1 font-sans text-xs font-medium uppercase tracking-wide text-brass hover:bg-brass/10 disabled:opacity-40"
          >
            Gain
          </button>
          <button
            type="button"
            onClick={() => adjust(unit, -parsed)}
            disabled={!canSpend}
            title={amountOk && !canSpend ? 'Not enough gold' : undefined}
            className="border border-ink/30 px-2.5 py-1 font-sans text-xs font-medium uppercase tracking-wide text-ink hover:bg-black/5 disabled:opacity-40"
          >
            Spend
          </button>
          {notice && <span className="text-[11px] text-oxblood">{notice}</span>}
        </div>
      )}
    </div>
  );
}
