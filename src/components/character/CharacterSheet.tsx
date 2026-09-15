import { useState } from 'react';
import type { Character, InventoryItem } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { ImageUpload } from '../ui/ImageUpload';
import traits from '../../config/daggerheart/traits.json';

interface CharacterSheetProps {
  character: Character;
  onSave: (character: Character) => Promise<void>;
  onUploadImage?: (file: File) => Promise<string>;
  canEdit?: boolean;
  compact?: boolean;
}

export function CharacterSheet({
  character,
  onSave,
  onUploadImage,
  canEdit = true,
  compact = false,
}: CharacterSheetProps) {
  const [char, setChar] = useState(character);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState('');

  const update = (partial: Partial<Character>) => {
    setChar((prev) => ({ ...prev, ...partial }));
  };

  const adjustHp = (delta: number) => {
    const current = Math.max(0, Math.min(char.hp.max, char.hp.current + delta));
    update({ hp: { ...char.hp, current } });
  };

  const adjustStress = (delta: number) => {
    const current = Math.max(0, Math.min(char.stress.max, char.stress.current + delta));
    update({ stress: { ...char.stress, current } });
  };

  const adjustHope = (delta: number) => {
    update({ hope: Math.max(0, char.hope + delta) });
  };

  const addInventoryItem = () => {
    if (!newItem.trim()) return;
    const item: InventoryItem = {
      id: crypto.randomUUID(),
      name: newItem.trim(),
      quantity: 1,
    };
    update({ inventory: [...char.inventory, item] });
    setNewItem('');
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ ...char, updatedAt: Date.now() });
    setSaving(false);
  };

  if (compact) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          {char.imageUrl && (
            <img src={char.imageUrl} alt={char.name} className="w-12 h-12 rounded-lg object-cover" />
          )}
          <div>
            <p className="font-bold text-slate-100">{char.name}</p>
            <p className="text-slate-400">{char.weaponName ?? 'Unarmed'}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatBadge label="HP" value={`${char.hp.current}/${char.hp.max}`} color="red" />
          <StatBadge label="Stress" value={`${char.stress.current}/${char.stress.max}`} color="yellow" />
          <StatBadge label="Hope" value={String(char.hope)} color="sky" />
        </div>
        <div className="flex flex-wrap gap-1">
          {traits.map((t) => (
            <span key={t.id} className="text-xs bg-slate-800 rounded px-1.5 py-0.5">
              {t.abbreviation}: {char.traits[t.id as keyof typeof char.traits] >= 0 ? '+' : ''}
              {char.traits[t.id as keyof typeof char.traits]}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        {onUploadImage && canEdit ? (
          <ImageUpload
            currentUrl={char.imageUrl}
            onUpload={async (file) => {
              const url = await onUploadImage(file);
              update({ imageUrl: url });
            }}
          />
        ) : char.imageUrl ? (
          <img src={char.imageUrl} alt={char.name} className="w-24 h-24 rounded-lg object-cover" />
        ) : null}
        <div className="flex-1">
          {canEdit ? (
            <Input label="Name" value={char.name} onChange={(e) => update({ name: e.target.value })} />
          ) : (
            <h2 className="text-2xl font-bold text-slate-100">{char.name}</h2>
          )}
          <p className="text-slate-400 text-sm mt-1">
            {char.weaponName ?? 'Unarmed'} {char.weaponDamage && `(${char.weaponDamage})`}
            {char.armorName && ` · ${char.armorName}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ResourceTracker
          label="HP"
          current={char.hp.current}
          max={char.hp.max}
          onAdjust={canEdit ? adjustHp : undefined}
          color="text-red-400"
        />
        <ResourceTracker
          label="Stress"
          current={char.stress.current}
          max={char.stress.max}
          onAdjust={canEdit ? adjustStress : undefined}
          color="text-yellow-400"
        />
        <ResourceTracker
          label="Hope"
          current={char.hope}
          max={6}
          onAdjust={canEdit ? adjustHope : undefined}
          color="text-sky-400"
        />
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-400">Evasion</p>
          <p className="text-2xl font-bold text-slate-200">{char.evasion}</p>
        </div>
      </div>

      <Card title="Traits">
        <div className="grid grid-cols-3 gap-2">
          {traits.map((t) => (
            <div key={t.id} className="bg-slate-900/50 rounded-lg p-2 text-center">
              <p className="text-xs text-slate-400">{t.name}</p>
              <p className="text-lg font-bold text-amber-400">
                {char.traits[t.id as keyof typeof char.traits] >= 0 ? '+' : ''}
                {char.traits[t.id as keyof typeof char.traits]}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Abilities">
        <div className="space-y-2">
          {char.abilities.map((a, i) => (
            <div key={a.id ?? i} className="bg-slate-900/50 rounded-lg p-3">
              <p className="font-medium text-slate-200">{a.name}</p>
              <p className="text-sm text-slate-400">{a.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Inventory">
        <div className="space-y-2">
          {char.inventory.map((item) => (
            <div key={item.id} className="flex justify-between items-center bg-slate-900/50 rounded px-3 py-2">
              <span className="text-slate-200">{item.name}</span>
              <span className="text-slate-400">×{item.quantity}</span>
            </div>
          ))}
          {canEdit && (
            <div className="flex gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add item..."
                onKeyDown={(e) => e.key === 'Enter' && addInventoryItem()}
              />
              <Button size="sm" onClick={addInventoryItem}>Add</Button>
            </div>
          )}
        </div>
      </Card>

      {canEdit && (
        <>
          <Textarea
            label="Notes"
            value={char.notes ?? ''}
            onChange={(e) => update({ notes: e.target.value })}
          />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      )}
    </div>
  );
}

function ResourceTracker({
  label,
  current,
  max,
  onAdjust,
  color,
}: {
  label: string;
  current: number;
  max: number;
  onAdjust?: (delta: number) => void;
  color: string;
}) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <div className="flex items-center justify-center gap-2 mt-1">
        {onAdjust && (
          <button onClick={() => onAdjust(-1)} className="text-slate-400 hover:text-slate-200">−</button>
        )}
        <p className={`text-2xl font-bold ${color}`}>{current}/{max}</p>
        {onAdjust && (
          <button onClick={() => onAdjust(1)} className="text-slate-400 hover:text-slate-200">+</button>
        )}
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    sky: 'text-sky-400',
  };
  return (
    <div className="bg-slate-900/50 rounded p-2 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
}
