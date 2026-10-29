import { useState } from 'react';
import { DIE_SIDES } from '../../lib/dice';
import {
  ATTACK_RANGES,
  DAMAGE_TYPES,
  ENEMY_TYPES,
  FEATURE_TYPES,
  labelForType,
  pointsForType,
} from '../../lib/enemies';
import type {
  DamageType,
  Enemy,
  EnemyAttack,
  EnemyFeature,
  EnemyType,
  FeatureType,
  Tier,
  WeaponDamage,
} from '../../types';
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

function emptyAttack(): EnemyAttack {
  return {
    id: crypto.randomUUID(),
    name: '',
    range: 'Melee',
    attackBonus: 0,
    damage: { count: 1, dice: 6, modifier: 0 },
    damageType: 'physical',
  };
}

function emptyFeature(): EnemyFeature {
  return {
    id: crypto.randomUUID(),
    name: '',
    type: 'action',
    description: '',
  };
}

export function EnemyBuilder({ campaignId, onSave, onUploadImage, existing }: EnemyBuilderProps) {
  const [enemy, setEnemy] = useState<Partial<Enemy>>(
    existing ?? {
      name: '',
      tier: 1,
      type: 'standard',
      description: '',
      tactics: '',
      difficulty: 10,
      hp: { current: 3, max: 3 },
      stress: { current: 0, max: 2 },
      damageThresholds: { major: 4, severe: 8 },
      attacks: [],
      features: [],
    },
  );
  const [saving, setSaving] = useState(false);

  const major = enemy.damageThresholds?.major ?? 4;
  const severe = enemy.damageThresholds?.severe ?? 8;
  const thresholdsValid = severe > major;
  const type = (enemy.type ?? 'standard') as EnemyType;

  const updateAttack = (index: number, patch: Partial<EnemyAttack>) => {
    const attacks = [...(enemy.attacks ?? [])];
    attacks[index] = { ...attacks[index], ...patch };
    setEnemy({ ...enemy, attacks });
  };

  const updateAttackDamage = (index: number, patch: Partial<WeaponDamage>) => {
    const attacks = [...(enemy.attacks ?? [])];
    attacks[index] = {
      ...attacks[index],
      damage: { ...attacks[index].damage, ...patch },
    };
    setEnemy({ ...enemy, attacks });
  };

  const removeAttack = (index: number) => {
    setEnemy({ ...enemy, attacks: enemy.attacks?.filter((_, i) => i !== index) });
  };

  const updateFeature = (index: number, patch: Partial<EnemyFeature>) => {
    const features = [...(enemy.features ?? [])];
    features[index] = { ...features[index], ...patch };
    setEnemy({ ...enemy, features });
  };

  const removeFeature = (index: number) => {
    setEnemy({ ...enemy, features: enemy.features?.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!enemy.name || !thresholdsValid) return;
    setSaving(true);
    const hpMax = enemy.hp?.max ?? 3;
    const stressMax = enemy.stress?.max ?? 2;
    const full: Enemy = {
      id: existing?.id ?? crypto.randomUUID(),
      campaignId,
      name: enemy.name!,
      imageUrl: enemy.imageUrl,
      tier: (enemy.tier ?? 1) as Tier,
      type,
      description: enemy.description || undefined,
      tactics: enemy.tactics || undefined,
      difficulty: enemy.difficulty ?? 10,
      damageThresholds: { major, severe },
      hp: { current: hpMax, max: hpMax },
      stress: { current: enemy.stress?.current ?? 0, max: stressMax },
      attacks: enemy.attacks ?? [],
      features: enemy.features ?? [],
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    await onSave(full);
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span className="rounded-md bg-red-950/50 px-2 py-0.5 text-xs font-medium text-red-300">
          {labelForType(type)} · {pointsForType(type)} pts
        </span>
        <span>Tier {enemy.tier ?? 1}</span>
      </div>

      <Card title="Basic Info">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Name"
            value={enemy.name ?? ''}
            onChange={(e) => setEnemy({ ...enemy, name: e.target.value })}
          />
          <Select
            label="Tier"
            value={String(enemy.tier ?? 1)}
            onChange={(e) => setEnemy({ ...enemy, tier: parseInt(e.target.value, 10) as Tier })}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </Select>
          <Select
            label="Type"
            value={type}
            onChange={(e) => setEnemy({ ...enemy, type: e.target.value as EnemyType })}
          >
            {ENEMY_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({t.points} pts)
              </option>
            ))}
          </Select>
          <Input
            label="Difficulty"
            type="number"
            value={enemy.difficulty ?? 10}
            onChange={(e) => setEnemy({ ...enemy, difficulty: parseInt(e.target.value, 10) || 0 })}
          />
          <Input
            label="HP Max"
            type="number"
            value={enemy.hp?.max ?? 3}
            onChange={(e) => {
              const max = parseInt(e.target.value, 10) || 0;
              setEnemy({ ...enemy, hp: { current: max, max } });
            }}
          />
          <Input
            label="Stress Max"
            type="number"
            value={enemy.stress?.max ?? 2}
            onChange={(e) => {
              const max = parseInt(e.target.value, 10) || 0;
              setEnemy({
                ...enemy,
                stress: { current: enemy.stress?.current ?? 0, max },
              });
            }}
          />
          <Input
            label="Major Threshold"
            type="number"
            value={major}
            onChange={(e) =>
              setEnemy({
                ...enemy,
                damageThresholds: {
                  major: parseInt(e.target.value, 10) || 0,
                  severe,
                },
              })
            }
          />
          <Input
            label="Severe Threshold"
            type="number"
            value={severe}
            onChange={(e) =>
              setEnemy({
                ...enemy,
                damageThresholds: {
                  major,
                  severe: parseInt(e.target.value, 10) || 0,
                },
              })
            }
          />
        </div>
        {!thresholdsValid && (
          <p className="mt-2 text-sm text-red-400">Severe threshold must be higher than Major.</p>
        )}
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

      <Card title="Description & Tactics">
        <div className="space-y-4">
          <Textarea
            label="Description"
            value={enemy.description ?? ''}
            onChange={(e) => setEnemy({ ...enemy, description: e.target.value })}
          />
          <Textarea
            label="Tactics"
            value={enemy.tactics ?? ''}
            onChange={(e) => setEnemy({ ...enemy, tactics: e.target.value })}
          />
        </div>
      </Card>

      <Card
        title="Attacks"
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEnemy({ ...enemy, attacks: [...(enemy.attacks ?? []), emptyAttack()] })}
          >
            + Add
          </Button>
        }
      >
        {(enemy.attacks?.length ?? 0) === 0 ? (
          <p className="text-sm italic text-slate-500">No attacks yet.</p>
        ) : (
          <div className="space-y-3">
            {enemy.attacks?.map((a, i) => (
              <div key={a.id} className="space-y-2 rounded-lg bg-slate-900/50 p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Input
                    label="Name"
                    value={a.name}
                    onChange={(e) => updateAttack(i, { name: e.target.value })}
                  />
                  <Select
                    label="Range"
                    value={a.range}
                    onChange={(e) =>
                      updateAttack(i, { range: e.target.value as EnemyAttack['range'] })
                    }
                  >
                    {ATTACK_RANGES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Attack Bonus"
                    type="number"
                    value={a.attackBonus}
                    onChange={(e) =>
                      updateAttack(i, { attackBonus: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                  <Select
                    label="Damage Type"
                    value={a.damageType}
                    onChange={(e) =>
                      updateAttack(i, { damageType: e.target.value as DamageType })
                    }
                  >
                    {DAMAGE_TYPES.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 items-end">
                  <Input
                    label="Damage Dice"
                    type="number"
                    min={1}
                    value={a.damage.count}
                    onChange={(e) =>
                      updateAttackDamage(i, { count: Math.max(1, parseInt(e.target.value, 10) || 1) })
                    }
                  />
                  <Select
                    label="Die"
                    value={String(a.damage.dice)}
                    onChange={(e) =>
                      updateAttackDamage(i, { dice: parseInt(e.target.value, 10) })
                    }
                  >
                    {DIE_SIDES.map((s) => (
                      <option key={s} value={s}>
                        d{s}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Damage Mod"
                    type="number"
                    value={a.damage.modifier}
                    onChange={(e) =>
                      updateAttackDamage(i, { modifier: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                  <Button size="sm" variant="danger" onClick={() => removeAttack(i)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Features"
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setEnemy({ ...enemy, features: [...(enemy.features ?? []), emptyFeature()] })
            }
          >
            + Add
          </Button>
        }
      >
        {(enemy.features?.length ?? 0) === 0 ? (
          <p className="text-sm italic text-slate-500">No features.</p>
        ) : (
          <div className="space-y-3">
            {enemy.features?.map((f, i) => (
              <div key={f.id} className="space-y-2 rounded-lg bg-slate-900/50 p-3">
                <div className="flex flex-wrap gap-2 items-end">
                  <Input
                    label="Name"
                    value={f.name}
                    onChange={(e) => updateFeature(i, { name: e.target.value })}
                    className="flex-1 min-w-[10rem]"
                  />
                  <Select
                    label="Type"
                    value={f.type}
                    onChange={(e) => updateFeature(i, { type: e.target.value as FeatureType })}
                  >
                    {FEATURE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                  <Button size="sm" variant="danger" onClick={() => removeFeature(i)}>
                    Remove
                  </Button>
                </div>
                <Textarea
                  label="Description"
                  value={f.description}
                  onChange={(e) => updateFeature(i, { description: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Button onClick={handleSave} disabled={saving || !enemy.name || !thresholdsValid}>
        {saving ? 'Saving...' : existing ? 'Update Enemy' : 'Create Enemy'}
      </Button>
    </div>
  );
}
