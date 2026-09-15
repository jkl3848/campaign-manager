import { useState } from 'react';
import type { Encounter, Enemy, EncounterEnemy } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';

interface EncounterBuilderProps {
  campaignId: string;
  enemies: Enemy[];
  onSave: (encounter: Encounter) => Promise<void>;
  existing?: Encounter;
}

export function EncounterBuilder({ campaignId, enemies, onSave, existing }: EncounterBuilderProps) {
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [encounterEnemies, setEncounterEnemies] = useState<EncounterEnemy[]>(existing?.enemies ?? []);
  const [saving, setSaving] = useState(false);

  const addEnemy = (enemyId: string) => {
    const enemy = enemies.find((e) => e.id === enemyId);
    if (!enemy) return;
    const existing = encounterEnemies.find((e) => e.enemyId === enemyId);
    if (existing) {
      setEncounterEnemies(encounterEnemies.map((e) =>
        e.enemyId === enemyId ? { ...e, count: e.count + 1 } : e,
      ));
    } else {
      setEncounterEnemies([...encounterEnemies, { enemyId, name: enemy.name, count: 1 }]);
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

  return (
    <div className="space-y-4 max-w-2xl">
      <Card title="Encounter Details">
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </Card>

      <Card title="Add Enemies">
        <Select
          label="Select enemy to add"
          value=""
          onChange={(e) => { if (e.target.value) addEnemy(e.target.value); }}
        >
          <option value="">Choose an enemy...</option>
          {enemies.map((e) => (
            <option key={e.id} value={e.id}>{e.name} (Tier {e.tier})</option>
          ))}
        </Select>
      </Card>

      <Card title="Encounter Roster">
        {encounterEnemies.length === 0 ? (
          <p className="text-slate-500 italic">No enemies added yet.</p>
        ) : (
          <div className="space-y-2">
            {encounterEnemies.map((e) => (
              <div key={e.enemyId} className="flex items-center justify-between bg-slate-900/50 rounded-lg px-4 py-3">
                <span className="text-slate-200 font-medium">{e.name}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => adjustCount(e.enemyId, -1)} className="text-slate-400 hover:text-slate-200">−</button>
                  <span className="text-amber-400 font-bold w-6 text-center">{e.count}</span>
                  <button onClick={() => adjustCount(e.enemyId, 1)} className="text-slate-400 hover:text-slate-200">+</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Button onClick={handleSave} disabled={saving || !name}>
        {saving ? 'Saving...' : existing ? 'Update Encounter' : 'Create Encounter'}
      </Button>
    </div>
  );
}
