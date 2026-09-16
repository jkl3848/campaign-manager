import { useState } from 'react';
import { createDiceRoll } from '../../lib/dice';
import type { DiceRoll } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface DiceRollerProps {
  onRoll: (roll: DiceRoll) => void;
  rollerName: string;
  campaignId: string;
  sessionId: string;
  isDm?: boolean;
}

export function DiceRoller({ onRoll, rollerName, campaignId, sessionId, isDm = false }: DiceRollerProps) {
  const [modifier, setModifier] = useState(0);
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState(false);
  const [rolling, setRolling] = useState(false);

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
        }),
      );
    }, 600);
  };

  return (
    <div className="space-y-3">
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
        {rolling ? 'Rolling...' : 'Roll 2d12'}
      </Button>
    </div>
  );
}
