import { useState } from 'react';
import { createDiceRoll, DIE_SIDES, formatDiceNotation, type DieSides } from '../../lib/dice';
import type { DiceRoll } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface DiceRollerProps {
  onRoll: (roll: DiceRoll) => void;
  rollerName: string;
  campaignId: string;
  sessionId: string;
  isDm?: boolean;
}

export function DiceRoller({ onRoll, rollerName, campaignId, sessionId, isDm = false }: DiceRollerProps) {
  const [count, setCount] = useState(2);
  const [sides, setSides] = useState<DieSides>(12);
  const [modifier, setModifier] = useState(0);
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState(false);
  const [rolling, setRolling] = useState(false);

  const notation = formatDiceNotation(Math.max(1, count || 1), sides);

  const handleRoll = () => {
    setRolling(true);

    setTimeout(() => {
      setRolling(false);
      onRoll(
        createDiceRoll({
          campaignId,
          sessionId,
          rollerName,
          modifier,
          label: label || undefined,
          secret: isDm && secret,
          isDm,
          count: Math.max(1, Math.min(99, count || 1)),
          sides,
        }),
      );
    }, 600);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Count"
          type="number"
          min={1}
          max={99}
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
        />
        <Select
          label="Die"
          value={sides}
          onChange={(e) => setSides(Number(e.target.value) as DieSides)}
        >
          {DIE_SIDES.map((s) => (
            <option key={s} value={s}>
              d{s}
            </option>
          ))}
        </Select>
      </div>
      <Input
        label="Modifier"
        type="number"
        value={modifier}
        onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
      />
      <Input
        label="Label (optional)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Attack roll"
      />
      {isDm && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={secret}
            onChange={(e) => setSecret(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500/50"
          />
          Roll secretly
        </label>
      )}
      <Button onClick={handleRoll} disabled={rolling} className="w-full">
        {rolling ? 'Rolling...' : `Roll ${notation}`}
      </Button>
      {count === 2 && sides === 12 && (
        <p className="text-center text-[11px] text-slate-500">
          Duality dice{isDm ? ' (no Hope/Fear for DM)' : ' — Hope or Fear on result'}
        </p>
      )}
    </div>
  );
}
