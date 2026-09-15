import { useState } from 'react';
import { rollDaggerheart } from '../../lib/dice';
import type { DiceRoll } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface DiceRollerProps {
  onRoll: (roll: DiceRoll) => void;
  rollerName: string;
  campaignId: string;
  sessionId: string;
}

export function DiceRoller({ onRoll, rollerName, campaignId, sessionId }: DiceRollerProps) {
  const [modifier, setModifier] = useState(0);
  const [label, setLabel] = useState('');
  const [rolling, setRolling] = useState(false);
  const [lastResult, setLastResult] = useState<ReturnType<typeof rollDaggerheart> | null>(null);
  const [showDice, setShowDice] = useState(false);

  const handleRoll = () => {
    setRolling(true);
    setShowDice(true);

    setTimeout(() => {
      const result = rollDaggerheart(modifier);
      setLastResult(result);
      setRolling(false);

      const roll: DiceRoll = {
        id: crypto.randomUUID(),
        campaignId,
        sessionId,
        rollerName,
        white: result.white,
        black: result.black,
        modifier: result.modifier,
        total: result.total,
        isCrit: result.isCrit,
        hopeGain: result.hopeGain,
        label: label || undefined,
        timestamp: Date.now(),
      };
      onRoll(roll);

      setTimeout(() => setShowDice(false), 3000);
    }, 800);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <Input
          label="Modifier"
          type="number"
          value={modifier}
          onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
          className="w-20"
        />
        <Input
          label="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Attack roll"
          className="flex-1"
        />
        <Button onClick={handleRoll} disabled={rolling} size="lg">
          {rolling ? 'Rolling...' : 'Roll 2d12'}
        </Button>
      </div>

      {(showDice || lastResult) && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className={`flex gap-6 ${rolling ? 'animate-bounce' : ''}`}>
            <Die value={rolling ? '?' : (lastResult?.white ?? 0)} color="white" />
            <Die value={rolling ? '?' : (lastResult?.black ?? 0)} color="black" />
          </div>

          {lastResult && !rolling && (
            <div className="text-center space-y-1">
              <p className="text-3xl font-bold text-amber-400">
                {lastResult.total}
                {lastResult.modifier !== 0 && (
                  <span className="text-lg text-slate-400 ml-2">
                    ({lastResult.white} + {lastResult.black}{' '}
                    {lastResult.modifier > 0 ? '+' : ''}
                    {lastResult.modifier})
                  </span>
                )}
              </p>
              {lastResult.isCrit && (
                <p className="text-red-400 font-bold text-lg animate-pulse">CRITICAL!</p>
              )}
              {lastResult.hopeGain === 'player' && (
                <p className="text-sky-300">+1 Hope (white higher)</p>
              )}
              {lastResult.hopeGain === 'dm' && (
                <p className="text-purple-300">+1 Fear (black higher)</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Die({ value, color }: { value: number | string; color: 'white' | 'black' }) {
  const bg = color === 'white'
    ? 'bg-gradient-to-br from-slate-100 to-slate-300 text-slate-900'
    : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white border border-slate-600';

  return (
    <div
      className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg ${bg}`}
    >
      {value}
    </div>
  );
}
