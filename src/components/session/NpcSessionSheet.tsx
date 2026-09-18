import { useEffect, useState } from 'react';
import type { Npc } from '../../types';

interface NpcSessionSheetProps {
  npc: Npc;
  canEdit: boolean;
  onSave: (npc: Npc) => Promise<void>;
}

export function NpcSessionSheet({ npc, canEdit, onSave }: NpcSessionSheetProps) {
  const [local, setLocal] = useState(npc);

  useEffect(() => {
    setLocal(npc);
  }, [npc]);

  const persist = async (next: Npc) => {
    setLocal(next);
    await onSave({ ...next, updatedAt: Date.now() });
  };

  const adjust = (field: 'hp' | 'stress', delta: number) => {
    if (!canEdit) return;
    const resource = local[field];
    const current = Math.max(0, Math.min(resource.max, resource.current + delta));
    void persist({ ...local, [field]: { ...resource, current } });
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start gap-2.5">
        {local.imageUrl ? (
          <img
            src={local.imageUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-sky-800/40"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-lg font-serif text-sky-500/60">
            {local.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif font-bold text-amber-50">{local.name}</p>
          <p className="text-[11px] text-sky-400/80">NPC</p>
          {local.description && (
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{local.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Resource
          label="HP"
          current={local.hp.current}
          max={local.hp.max}
          color="text-red-400"
          onAdjust={canEdit ? (d) => adjust('hp', d) : undefined}
        />
        <Resource
          label="Stress"
          current={local.stress.current}
          max={local.stress.max}
          color="text-yellow-400"
          onAdjust={canEdit ? (d) => adjust('stress', d) : undefined}
        />
        <div className="rounded-md bg-slate-900/60 px-2 py-1.5 text-center">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Evasion</p>
          <p className="text-lg font-bold text-slate-200">{local.evasion}</p>
        </div>
      </div>

      {local.traits && Object.keys(local.traits).length > 0 && (
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-2.5 py-2">
          <p className="mb-1.5 font-serif text-xs font-semibold text-amber-200/90">Traits</p>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(local.traits).map(([id, val]) =>
              val == null ? null : (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-md bg-slate-900/60 px-2 py-1"
                >
                  <span className="text-[11px] capitalize text-slate-400">{id}</span>
                  <span className="text-sm font-bold text-amber-400">
                    {val >= 0 ? '+' : ''}
                    {val}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {local.abilities.length > 0 && (
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-2.5 py-2">
          <p className="mb-1.5 font-serif text-xs font-semibold text-amber-200/90">Abilities</p>
          <div className="space-y-1">
            {local.abilities.map((a, i) => (
              <div key={a.id ?? i} className="rounded-md bg-slate-900/60 px-2 py-1.5">
                <p className="text-[11px] font-medium text-slate-200">{a.name}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500 line-clamp-2">
                  {a.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {local.notes && (
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-2.5 py-2">
          <p className="mb-1 font-serif text-xs font-semibold text-amber-200/90">Notes</p>
          <p className="text-[11px] leading-relaxed text-slate-400 whitespace-pre-wrap">{local.notes}</p>
        </div>
      )}
    </div>
  );
}

function Resource({
  label,
  current,
  max,
  color,
  onAdjust,
}: {
  label: string;
  current: number;
  max: number;
  color: string;
  onAdjust?: (delta: number) => void;
}) {
  return (
    <div className="rounded-md bg-slate-900/60 px-2 py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex items-center justify-center gap-1">
        {onAdjust && (
          <button
            type="button"
            onClick={() => onAdjust(-1)}
            className="px-0.5 text-xs text-slate-500 hover:text-slate-200"
          >
            −
          </button>
        )}
        <span className={`text-lg font-bold ${color}`}>
          {current}/{max}
        </span>
        {onAdjust && (
          <button
            type="button"
            onClick={() => onAdjust(1)}
            className="px-0.5 text-xs text-slate-500 hover:text-slate-200"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
