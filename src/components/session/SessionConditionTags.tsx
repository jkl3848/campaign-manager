import {
  SESSION_CONDITIONS,
  SESSION_CONDITION_LABELS,
  type SessionCondition,
} from '../../lib/sessionConditions';

interface SessionConditionTagsProps {
  active: SessionCondition[];
  isDm: boolean;
  onToggle?: (condition: SessionCondition) => void;
}

export function SessionConditionTags({ active, isDm, onToggle }: SessionConditionTagsProps) {
  const activeSet = new Set(active);

  if (!isDm && active.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">Conditions</p>
      <div className="flex flex-wrap gap-1">
        {SESSION_CONDITIONS.map((condition) => {
          const isActive = activeSet.has(condition);
          if (!isDm && !isActive) {
            return null;
          }
          const label = SESSION_CONDITION_LABELS[condition];
          if (isDm && onToggle) {
            return (
              <button
                key={condition}
                type="button"
                onClick={() => onToggle(condition)}
                className={`rounded border px-1.5 py-0.5 font-display text-[10px] tracking-wide transition-colors ${
                  isActive
                    ? 'border-amber-500/60 bg-amber-950/50 text-amber-100'
                    : 'border-slate-600/50 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                }`}
                title={isActive ? `Remove ${label}` : `Apply ${label}`}
              >
                {label}
              </button>
            );
          }
          return (
            <span
              key={condition}
              className="rounded border border-amber-500/50 bg-amber-950/40 px-1.5 py-0.5 font-display text-[10px] tracking-wide text-amber-100"
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
