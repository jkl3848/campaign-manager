import { useMemo, useState } from 'react';
import type { Character, Encounter, Enemy, EncounterEnemy, Npc, Tier } from '../../types';
import {
  calculateEncounterBudget,
  labelForType,
  pointsForType,
} from '../../lib/enemies';
import { getTierForLevel } from '../../lib/levelUp';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';

interface EncounterBuilderProps {
  campaignId: string;
  enemies: Enemy[];
  characters: Character[];
  npcs: Npc[];
  onSave: (encounter: Encounter) => Promise<void>;
  existing?: Encounter;
}

function difficultyColor(label: string): string {
  if (label === 'Easy' || label === 'Slightly easier') return 'text-emerald-400';
  if (label === 'On budget') return 'text-amber-400';
  return 'text-red-400';
}

function barColor(label: string): string {
  if (label === 'Easy' || label === 'Slightly easier') return 'bg-emerald-500';
  if (label === 'On budget') return 'bg-amber-500';
  return 'bg-red-500';
}

export function EncounterBuilder({
  campaignId,
  enemies,
  characters,
  npcs,
  onSave,
  existing,
}: EncounterBuilderProps) {
  const partyCharacters = characters.filter((c) => c.inParty !== false);
  const partyNpcs = npcs.filter((n) => n.inParty);
  const defaultPcCount = partyCharacters.length;
  const defaultNpcCount = partyNpcs.length;
  const defaultPartyTier: Tier =
    partyCharacters.length > 0
      ? getTierForLevel(Math.max(...partyCharacters.map((c) => c.level)))
      : 1;

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [encounterEnemies, setEncounterEnemies] = useState<EncounterEnemy[]>(
    existing?.enemies ?? [],
  );
  const [pcCount, setPcCount] = useState(defaultPcCount);
  const [npcCount, setNpcCount] = useState(defaultNpcCount);
  const [partyTier, setPartyTier] = useState<Tier>(defaultPartyTier);
  const [saving, setSaving] = useState(false);

  const budget = useMemo(
    () =>
      calculateEncounterBudget({
        pcCount,
        npcCount,
        partyTier,
        enemies,
        roster: encounterEnemies,
      }),
    [pcCount, npcCount, partyTier, enemies, encounterEnemies],
  );

  const addEnemy = (enemyId: string) => {
    const enemy = enemies.find((e) => e.id === enemyId);
    if (!enemy) return;
    const row = encounterEnemies.find((e) => e.enemyId === enemyId);
    if (row) {
      setEncounterEnemies(
        encounterEnemies.map((e) =>
          e.enemyId === enemyId ? { ...e, count: e.count + 1 } : e,
        ),
      );
    } else {
      setEncounterEnemies([
        ...encounterEnemies,
        { enemyId, name: enemy.name, count: 1 },
      ]);
    }
  };

  const adjustCount = (enemyId: string, delta: number) => {
    setEncounterEnemies(
      encounterEnemies
        .map((e) => (e.enemyId === enemyId ? { ...e, count: e.count + delta } : e))
        .filter((e) => e.count > 0),
    );
  };

  const handleSave = async () => {
    if (!name) return;
    setSaving(true);
    const encounter: Encounter = {
      id: existing?.id ?? crypto.randomUUID(),
      campaignId,
      name,
      description: description || undefined,
      enemies: encounterEnemies,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    await onSave(encounter);
    setSaving(false);
  };

  const ratio = budget.budget > 0 ? Math.min(1.5, budget.spent / budget.budget) : budget.spent > 0 ? 1.5 : 0;

  return (
    <div className="space-y-4 max-w-2xl">
      <Card title="Encounter Details">
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </Card>

      <Card title="Party Assumptions">
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="PCs"
            type="number"
            min={0}
            value={pcCount}
            onChange={(e) => setPcCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
          <Input
            label="Party NPCs"
            type="number"
            min={0}
            value={npcCount}
            onChange={(e) => setNpcCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
          <Select
            label="Party Tier"
            value={String(partyTier)}
            onChange={(e) => setPartyTier(parseInt(e.target.value, 10) as Tier)}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </Select>
        </div>
      </Card>

      <Card title="Battle Points">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-2xl font-bold text-slate-100">
              {budget.spent}
              <span className="text-base font-normal text-slate-500"> / {budget.budget}</span>
            </p>
            <p className={`text-sm font-semibold ${difficultyColor(budget.difficulty)}`}>
              {budget.difficulty}
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${barColor(budget.difficulty)}`}
              style={{ width: `${Math.min(100, (ratio / 1.5) * 100)}%` }}
            />
          </div>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>
              Base: (3×{pcCount} PC) + (1.5×{npcCount} NPC) + 2 = {budget.base}
            </li>
            {budget.modifiers.map((m) => (
              <li key={m.reason}>
                {m.amount >= 0 ? '+' : ''}
                {m.amount}: {m.reason}
              </li>
            ))}
            {budget.modifiers.length === 0 && (
              <li className="italic text-slate-600">No budget modifiers</li>
            )}
          </ul>
        </div>
      </Card>

      <Card title="Add Enemies">
        <Select
          label="Select enemy to add"
          value=""
          onChange={(e) => {
            if (e.target.value) addEnemy(e.target.value);
          }}
        >
          <option value="">Choose an enemy...</option>
          {enemies.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} (T{e.tier} {labelForType(e.type)}, {pointsForType(e.type)})
            </option>
          ))}
        </Select>
      </Card>

      <Card title="Encounter Roster">
        {encounterEnemies.length === 0 ? (
          <p className="text-slate-400 italic">No enemies added yet.</p>
        ) : (
          <div className="space-y-2">
            {encounterEnemies.map((row) => {
              const enemy = enemies.find((e) => e.id === row.enemyId);
              const pts = enemy ? pointsForType(enemy.type) : 0;
              const rowTotal = pts * row.count;
              return (
                <div
                  key={row.enemyId}
                  className="flex items-center justify-between bg-slate-900/50 rounded-lg px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-slate-200 font-medium truncate">{row.name}</p>
                    <p className="text-xs text-slate-500">
                      {enemy
                        ? `${labelForType(enemy.type)} · ${pts} pts each · ${row.count}× = ${rowTotal}`
                        : 'Missing enemy'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => adjustCount(row.enemyId, -1)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      −
                    </button>
                    <span className="text-amber-400 font-bold w-6 text-center">{row.count}</span>
                    <button
                      type="button"
                      onClick={() => adjustCount(row.enemyId, 1)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Button onClick={handleSave} disabled={saving || !name}>
        {saving ? 'Saving...' : existing ? 'Update Encounter' : 'Create Encounter'}
      </Button>
    </div>
  );
}
