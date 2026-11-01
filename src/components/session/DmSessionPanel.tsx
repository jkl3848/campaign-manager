import type { Enemy, Npc, Encounter, Session } from '../../types';
import { isAdvancedNpc } from '../../lib/advancedNpc';
import { labelForType } from '../../lib/enemies';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

interface DmSessionPanelProps {
  enemies: Enemy[];
  npcs: Npc[];
  encounters: Encounter[];
  session: Session;
  onStartCombat: (encounterId?: string) => void;
  onEndCombat: () => void;
  onNextRound: () => void;
  onAdjustCombatant: (id: string, field: 'hp' | 'stress', delta: number) => void;
  onSelectEnemy: (enemyId: string, combatantId?: string) => void;
}

export function DmSessionPanel({
  enemies,
  npcs,
  encounters,
  session,
  onStartCombat,
  onEndCombat,
  onNextRound,
  onAdjustCombatant,
  onSelectEnemy,
}: DmSessionPanelProps) {
  return (
    <aside className="absolute left-0 top-0 bottom-0 z-20 flex w-72 flex-col border-r border-slate-700/60 bg-slate-950/90 backdrop-blur-md">
      <div className="border-b border-slate-700/60 px-4 py-3">
        <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-amber-400/80">
          DM Panel
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Combat */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Combat
          </h3>
          {session.combatActive ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-200">Round {session.round}</p>
              {session.combatants.map((c) => (
                <div key={c.id} className="rounded-lg bg-slate-900/70 px-3 py-2 text-xs">
                  {c.type === 'enemy' ? (
                    <button
                      type="button"
                      onClick={() => onSelectEnemy(c.refId, c.id)}
                      className="w-full text-left font-medium text-slate-200 truncate hover:text-amber-200"
                    >
                      {c.name}
                    </button>
                  ) : (
                    <p className="font-medium text-slate-200 truncate">{c.name}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-slate-400">
                    <ResourceControl
                      label="HP"
                      current={c.hp.current}
                      max={c.hp.max}
                      onAdjust={(d) => onAdjustCombatant(c.id, 'hp', d)}
                    />
                    <ResourceControl
                      label="Str"
                      current={c.stress.current}
                      max={c.stress.max}
                      onAdjust={(d) => onAdjustCombatant(c.id, 'stress', d)}
                    />
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Button variant="secondary" size="sm" className="flex-1" onClick={onNextRound}>
                  Next Round
                </Button>
                <Button variant="danger" size="sm" onClick={onEndCombat}>
                  End
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Select
                label=""
                value=""
                onChange={(e) => {
                  if (e.target.value) onStartCombat(e.target.value);
                }}
              >
                <option value="">Load encounter...</option>
                {encounters.map((enc) => (
                  <option key={enc.id} value={enc.id}>
                    {enc.name}
                  </option>
                ))}
              </Select>
              <Button size="sm" className="w-full" onClick={() => onStartCombat()}>
                Start Empty Combat
              </Button>
            </div>
          )}
        </section>

        {/* Enemies */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Enemies ({enemies.length})
          </h3>
          {enemies.length === 0 ? (
            <p className="text-xs italic text-slate-400">No enemies in campaign.</p>
          ) : (
            <div className="space-y-1.5">
              {enemies.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onSelectEnemy(e.id)}
                  className="flex w-full items-center gap-2 rounded-lg bg-slate-900/70 px-2.5 py-2 text-left hover:bg-slate-800/80"
                >
                  {e.imageUrl ? (
                    <img src={e.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-red-950/50 text-xs font-bold text-red-400">
                      {e.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-200">{e.name}</p>
                    <p className="text-[10px] text-slate-400">
                      T{e.tier} · {labelForType(e.type)} · HP {e.hp.max} · Diff {e.difficulty}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* NPCs */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            NPCs ({npcs.length})
          </h3>
          {npcs.length === 0 ? (
            <p className="text-xs italic text-slate-400">No NPCs in campaign.</p>
          ) : (
            <div className="space-y-1.5">
              {npcs.map((n) => {
                const advanced = isAdvancedNpc(n);
                return (
                  <div key={n.id} className="flex items-center gap-2 rounded-lg bg-slate-900/70 px-2.5 py-2">
                    {n.imageUrl ? (
                      <img src={n.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-sky-950/50 text-xs font-bold text-sky-400">
                        {n.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200">{n.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {advanced && (
                          <span className="text-[10px] text-amber-400/90">Lv {n.sheet.level}</span>
                        )}
                        {n.inParty && (
                          <span className="text-[10px] text-sky-400">In party</span>
                        )}
                      </div>
                      {!advanced && n.description && (
                        <p className="truncate text-[10px] text-slate-400">{n.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

function ResourceControl({
  label,
  current,
  max,
  onAdjust,
}: {
  label: string;
  current: number;
  max: number;
  onAdjust: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-slate-400">{label}</span>
      <button onClick={() => onAdjust(-1)} className="text-slate-400 hover:text-slate-300 px-0.5">
        −
      </button>
      <span className="text-slate-300">
        {current}/{max}
      </span>
      <button onClick={() => onAdjust(1)} className="text-slate-400 hover:text-slate-300 px-0.5">
        +
      </button>
    </div>
  );
}
