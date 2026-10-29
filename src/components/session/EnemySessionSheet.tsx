import type { Combatant, Enemy, EnemyAttack } from '../../types';
import { formatWeaponDamage } from '../../lib/weaponDamage';
import { DAMAGE_TYPES, FEATURE_TYPES, formatAttack, labelForType } from '../../lib/enemies';

interface EnemySessionSheetProps {
  enemy: Enemy;
  combatant?: Combatant;
  onAdjustCombatant?: (field: 'hp' | 'stress', delta: number) => void;
  onAttackRoll?: (label: string, modifier: number) => void;
  onDamageRoll?: (label: string, count: number, sides: number, modifier: number) => void;
}

export function EnemySessionSheet({
  enemy,
  combatant,
  onAdjustCombatant,
  onAttackRoll,
  onDamageRoll,
}: EnemySessionSheetProps) {
  const hp = combatant?.hp ?? { current: enemy.hp.max, max: enemy.hp.max };
  const stress = combatant?.stress ?? { current: 0, max: enemy.stress.max };
  const canAdjust = !!combatant && !!onAdjustCombatant;

  const rollAttack = (a: EnemyAttack) => {
    onAttackRoll?.(`${enemy.name}: ${a.name}`, a.attackBonus);
  };

  const rollDamage = (a: EnemyAttack) => {
    const dtype = DAMAGE_TYPES.find((d) => d.id === a.damageType)?.label ?? a.damageType;
    onDamageRoll?.(
      `${enemy.name}: ${a.name} dmg (${dtype})`,
      a.damage.count,
      a.damage.dice,
      a.damage.modifier,
    );
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start gap-2.5">
        {enemy.imageUrl ? (
          <img
            src={enemy.imageUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-red-800/40"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-lg font-serif text-red-500/60">
            {enemy.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif font-bold text-amber-50">{enemy.name}</p>
          <p className="text-[11px] text-red-400/80">
            Tier {enemy.tier} · {labelForType(enemy.type)}
            {combatant ? ` · ${combatant.name}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Stat label="Difficulty" value={enemy.difficulty} />
        <Stat
          label="Thresholds"
          value={`${enemy.damageThresholds.major} / ${enemy.damageThresholds.severe}`}
        />
        <Resource
          label="HP"
          current={hp.current}
          max={hp.max}
          color="text-red-400"
          onAdjust={canAdjust ? (d) => onAdjustCombatant!('hp', d) : undefined}
        />
        <Resource
          label="Stress"
          current={stress.current}
          max={stress.max}
          color="text-yellow-400"
          onAdjust={canAdjust ? (d) => onAdjustCombatant!('stress', d) : undefined}
        />
      </div>

      {enemy.description && (
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-2.5 py-2">
          <p className="mb-1 font-serif text-xs font-semibold text-amber-200/90">Description</p>
          <p className="text-[11px] leading-relaxed text-slate-400 whitespace-pre-wrap">
            {enemy.description}
          </p>
        </div>
      )}

      {enemy.tactics && (
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-2.5 py-2">
          <p className="mb-1 font-serif text-xs font-semibold text-amber-200/90">Tactics</p>
          <p className="text-[11px] leading-relaxed text-slate-400 whitespace-pre-wrap">
            {enemy.tactics}
          </p>
        </div>
      )}

      {enemy.attacks.length > 0 && (
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-2.5 py-2">
          <p className="mb-1.5 font-serif text-xs font-semibold text-amber-200/90">Attacks</p>
          <div className="space-y-2">
            {enemy.attacks.map((a) => (
              <div key={a.id} className="rounded-md bg-slate-900/60 px-2 py-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-200">{a.name || 'Attack'}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{formatAttack(a)}</p>
                    <p className="text-[10px] text-slate-600">
                      {formatWeaponDamage(a.damage)}{' '}
                      {DAMAGE_TYPES.find((d) => d.id === a.damageType)?.label}
                    </p>
                  </div>
                  {(onAttackRoll || onDamageRoll) && (
                    <div className="flex shrink-0 flex-col gap-1">
                      {onAttackRoll && (
                        <button
                          type="button"
                          onClick={() => rollAttack(a)}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-200 bg-amber-950/40 hover:bg-amber-900/50"
                        >
                          Attack
                        </button>
                      )}
                      {onDamageRoll && (
                        <button
                          type="button"
                          onClick={() => rollDamage(a)}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-red-200 bg-red-950/40 hover:bg-red-900/50"
                        >
                          Damage
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {enemy.features.length > 0 && (
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-2.5 py-2">
          <p className="mb-1.5 font-serif text-xs font-semibold text-amber-200/90">Features</p>
          <div className="space-y-1.5">
            {enemy.features.map((f) => (
              <div key={f.id} className="rounded-md bg-slate-900/60 px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-medium text-slate-200">{f.name}</p>
                  <span className="rounded bg-slate-800 px-1 py-0.5 text-[9px] uppercase tracking-wide text-slate-400">
                    {FEATURE_TYPES.find((t) => t.id === f.type)?.label ?? f.type}
                  </span>
                </div>
                {f.description && (
                  <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500 whitespace-pre-wrap">
                    {f.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-slate-900/60 px-2 py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-200">{value}</p>
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
