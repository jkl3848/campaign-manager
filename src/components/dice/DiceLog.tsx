import type { DiceRoll } from '../../types';
import { formatDiceNotation, isDualityRoll } from '../../lib/dice';

interface DiceLogProps {
  rolls: DiceRoll[];
  isDm?: boolean;
}

export function DiceLog({ rolls, isDm = false }: DiceLogProps) {
  const visibleRolls = rolls.filter((r) => !r.secret || isDm);

  if (visibleRolls.length === 0) {
    return <p className="text-slate-500 text-sm italic">No rolls yet this session.</p>;
  }

  return (
    <div className="space-y-2">
      {visibleRolls.map((roll) => (
        <div
          key={roll.id}
          className="flex items-center justify-between text-sm bg-slate-900/50 rounded-lg px-3 py-2"
        >
          <div>
            <span className="font-medium text-slate-200">{roll.rollerName}</span>
            {roll.label && <span className="text-slate-400 ml-2">— {roll.label}</span>}
            {roll.secret && (
              <span className="text-purple-400/70 ml-2 text-xs">(secret)</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isDualityRoll(roll) ? (
              <span className="text-slate-400">
                <span className="text-slate-200">{roll.white}</span>/
                <span className="text-slate-500">{roll.black}</span>
              </span>
            ) : (
              <span className="text-slate-400">
                <span className="text-slate-500">
                  {formatDiceNotation(roll.count ?? 1, roll.sides ?? 20)}
                </span>{' '}
                <span className="text-slate-300">{roll.results?.join(', ')}</span>
              </span>
            )}
            <span className="font-bold text-amber-400">{roll.total}</span>
            {roll.isCrit && <span className="text-red-400 text-xs font-bold">CRIT</span>}
            {roll.hopeGain === 'player' && (
              <span className="text-sky-400 text-xs">Hope</span>
            )}
            {roll.hopeGain === 'dm' && (
              <span className="text-purple-400 text-xs">Fear</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
