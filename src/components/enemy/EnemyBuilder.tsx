import { useState } from 'react';
import enemyTemplates from '../../config/daggerheart/enemy-templates.json';
import type { Enemy, Attack, Ability, TraitId } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { ImageUpload } from '../ui/ImageUpload';

interface EnemyBuilderProps {
  campaignId: string;
  onSave: (enemy: Enemy) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
  existing?: Enemy;
}

export function EnemyBuilder({ campaignId, onSave, onUploadImage, existing }: EnemyBuilderProps) {
  const [enemy, setEnemy] = useState<Partial<Enemy>>(
    existing ?? {
      name: '',
      tier: 1,
      hp: { current: 3, max: 3 },
      stress: { current: 0, max: 2 },
      evasion: 10,
      difficulty: 10,
      damageThresholds: { minor: 4, major: 8 },
      attacks: [],
      abilities: [],
      tags: [],
    },
  );
  const [saving, setSaving] = useState(false);

  const loadTemplate = (templateId: string) => {
    const t = enemyTemplates.find((e) => e.id === templateId);
    if (!t) return;
    setEnemy({
      ...enemy,
      name: t.name,
      tier: t.tier,
      hp: { current: t.hp, max: t.hp },
      stress: { current: 0, max: t.stress },
      evasion: t.evasion,
      difficulty: t.difficulty,
      damageThresholds: t.damageThresholds,
      attacks: t.attacks.map((a) => ({ ...a, trait: a.trait as TraitId })),
      abilities: t.abilities,
      tags: t.tags,
      templateId: t.id,
    });
  };

  const addAttack = () => {
    const attacks = [...(enemy.attacks ?? []), { name: '', range: 'Melee', damage: 'd6', trait: 'strength' as TraitId }];
    setEnemy({ ...enemy, attacks });
  };

  const updateAttack = (index: number, field: keyof Attack, value: string) => {
    const attacks = [...(enemy.attacks ?? [])];
    attacks[index] = { ...attacks[index], [field]: value };
    setEnemy({ ...enemy, attacks });
  };

  const removeAttack = (index: number) => {
    setEnemy({ ...enemy, attacks: enemy.attacks?.filter((_, i) => i !== index) });
  };

  const addAbility = () => {
    const abilities = [...(enemy.abilities ?? []), { name: '', description: '' }];
    setEnemy({ ...enemy, abilities });
  };

  const updateAbility = (index: number, field: keyof Ability, value: string) => {
    const abilities = [...(enemy.abilities ?? [])];
    abilities[index] = { ...abilities[index], [field]: value };
    setEnemy({ ...enemy, abilities });
  };

  const removeAbility = (index: number) => {
    setEnemy({ ...enemy, abilities: enemy.abilities?.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!enemy.name) return;
    setSaving(true);
    const full: Enemy = {
      id: existing?.id ?? crypto.randomUUID(),
      campaignId,
      name: enemy.name!,
      imageUrl: enemy.imageUrl,
      tier: enemy.tier ?? 1,
      hp: enemy.hp!,
      stress: enemy.stress!,
      evasion: enemy.evasion ?? 10,
      difficulty: enemy.difficulty ?? 10,
      damageThresholds: enemy.damageThresholds!,
      attacks: enemy.attacks ?? [],
      abilities: enemy.abilities ?? [],
      tags: enemy.tags ?? [],
      notes: enemy.notes,
      templateId: enemy.templateId,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    await onSave(full);
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Card title="Load Template">
        <Select
          label="Start from template"
          value={enemy.templateId ?? ''}
          onChange={(e) => loadTemplate(e.target.value)}
        >
          <option value="">Custom enemy...</option>
          {enemyTemplates.map((t) => (
            <option key={t.id} value={t.id}>{t.name} (Tier {t.tier})</option>
          ))}
        </Select>
      </Card>

      <Card title="Basic Info">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" value={enemy.name ?? ''} onChange={(e) => setEnemy({ ...enemy, name: e.target.value })} />
          <Input label="Tier" type="number" min={1} max={4} value={enemy.tier ?? 1} onChange={(e) => setEnemy({ ...enemy, tier: parseInt(e.target.value) })} />
          <Input label="HP Max" type="number" value={enemy.hp?.max ?? 3} onChange={(e) => setEnemy({ ...enemy, hp: { current: parseInt(e.target.value), max: parseInt(e.target.value) } })} />
          <Input label="Stress Max" type="number" value={enemy.stress?.max ?? 2} onChange={(e) => setEnemy({ ...enemy, stress: { current: enemy.stress?.current ?? 0, max: parseInt(e.target.value) } })} />
          <Input label="Evasion" type="number" value={enemy.evasion ?? 10} onChange={(e) => setEnemy({ ...enemy, evasion: parseInt(e.target.value) })} />
          <Input label="Difficulty" type="number" value={enemy.difficulty ?? 10} onChange={(e) => setEnemy({ ...enemy, difficulty: parseInt(e.target.value) })} />
          <Input label="Minor Threshold" type="number" value={enemy.damageThresholds?.minor ?? 4} onChange={(e) => setEnemy({ ...enemy, damageThresholds: { ...enemy.damageThresholds!, minor: parseInt(e.target.value) } })} />
          <Input label="Major Threshold" type="number" value={enemy.damageThresholds?.major ?? 8} onChange={(e) => setEnemy({ ...enemy, damageThresholds: { ...enemy.damageThresholds!, major: parseInt(e.target.value) } })} />
        </div>
        <div className="mt-4">
          <ImageUpload
            currentUrl={enemy.imageUrl}
            onUpload={async (file) => {
              const url = await onUploadImage(file);
              setEnemy({ ...enemy, imageUrl: url });
            }}
          />
        </div>
      </Card>

      <Card
        title="Attacks"
        actions={<Button size="sm" variant="secondary" onClick={addAttack}>+ Add</Button>}
      >
        <div className="space-y-3">
          {enemy.attacks?.map((a, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-end bg-slate-900/50 rounded-lg p-3">
              <Input label="Name" value={a.name} onChange={(e) => updateAttack(i, 'name', e.target.value)} />
              <Input label="Range" value={a.range} onChange={(e) => updateAttack(i, 'range', e.target.value)} />
              <Input label="Damage" value={a.damage} onChange={(e) => updateAttack(i, 'damage', e.target.value)} />
              <Select label="Trait" value={a.trait} onChange={(e) => updateAttack(i, 'trait', e.target.value)}>
                {['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
              <Button size="sm" variant="danger" onClick={() => removeAttack(i)}>Remove</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Abilities"
        actions={<Button size="sm" variant="secondary" onClick={addAbility}>+ Add</Button>}
      >
        <div className="space-y-3">
          {enemy.abilities?.map((a, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <Input label="Name" value={a.name} onChange={(e) => updateAbility(i, 'name', e.target.value)} className="flex-1" />
                <Button size="sm" variant="danger" onClick={() => removeAbility(i)}>Remove</Button>
              </div>
              <Textarea label="Description" value={a.description} onChange={(e) => updateAbility(i, 'description', e.target.value)} />
            </div>
          ))}
        </div>
      </Card>

      <Textarea label="Notes" value={enemy.notes ?? ''} onChange={(e) => setEnemy({ ...enemy, notes: e.target.value })} />

      <Button onClick={handleSave} disabled={saving || !enemy.name}>
        {saving ? 'Saving...' : existing ? 'Update Enemy' : 'Create Enemy'}
      </Button>
    </div>
  );
}
