import { useState } from 'react';
import type { Npc, Ability } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { ImageUpload } from '../ui/ImageUpload';

interface NpcBuilderProps {
  campaignId: string;
  onSave: (npc: Npc) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
  existing?: Npc;
}

export function NpcBuilder({ campaignId, onSave, onUploadImage, existing }: NpcBuilderProps) {
  const [npc, setNpc] = useState<Partial<Npc>>(
    existing ?? {
      name: '',
      hp: { current: 3, max: 3 },
      stress: { current: 0, max: 3 },
      evasion: 10,
      traits: {},
      abilities: [],
      inParty: false,
    },
  );
  const [saving, setSaving] = useState(false);

  const addAbility = () => {
    setNpc({ ...npc, abilities: [...(npc.abilities ?? []), { name: '', description: '' }] });
  };

  const updateAbility = (index: number, field: keyof Ability, value: string) => {
    const abilities = [...(npc.abilities ?? [])];
    abilities[index] = { ...abilities[index], [field]: value };
    setNpc({ ...npc, abilities });
  };

  const removeAbility = (index: number) => {
    setNpc({ ...npc, abilities: npc.abilities?.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!npc.name) return;
    setSaving(true);
    const full: Npc = {
      id: existing?.id ?? crypto.randomUUID(),
      campaignId,
      name: npc.name!,
      imageUrl: npc.imageUrl,
      description: npc.description,
      hp: npc.hp!,
      stress: npc.stress!,
      evasion: npc.evasion ?? 10,
      traits: npc.traits ?? {},
      abilities: npc.abilities ?? [],
      inParty: npc.inParty ?? false,
      notes: npc.notes,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    await onSave(full);
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Card title="NPC Info">
        <div className="space-y-4">
          <Input label="Name" value={npc.name ?? ''} onChange={(e) => setNpc({ ...npc, name: e.target.value })} />
          <Textarea label="Description" value={npc.description ?? ''} onChange={(e) => setNpc({ ...npc, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="HP Max" type="number" value={npc.hp?.max ?? 3} onChange={(e) => setNpc({ ...npc, hp: { current: parseInt(e.target.value), max: parseInt(e.target.value) } })} />
            <Input label="Stress Max" type="number" value={npc.stress?.max ?? 3} onChange={(e) => setNpc({ ...npc, stress: { current: npc.stress?.current ?? 0, max: parseInt(e.target.value) } })} />
            <Input label="Evasion" type="number" value={npc.evasion ?? 10} onChange={(e) => setNpc({ ...npc, evasion: parseInt(e.target.value) })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={npc.inParty ?? false}
              onChange={(e) => setNpc({ ...npc, inParty: e.target.checked })}
              className="rounded"
            />
            Add to party
          </label>
          <ImageUpload
            currentUrl={npc.imageUrl}
            onUpload={async (file) => {
              const url = await onUploadImage(file);
              setNpc({ ...npc, imageUrl: url });
            }}
          />
        </div>
      </Card>

      <Card
        title="Abilities"
        actions={<Button size="sm" variant="secondary" onClick={addAbility}>+ Add</Button>}
      >
        <div className="space-y-3">
          {npc.abilities?.map((a, i) => (
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

      <Textarea label="Notes" value={npc.notes ?? ''} onChange={(e) => setNpc({ ...npc, notes: e.target.value })} />

      <Button onClick={handleSave} disabled={saving || !npc.name}>
        {saving ? 'Saving...' : existing ? 'Update NPC' : 'Create NPC'}
      </Button>
    </div>
  );
}
