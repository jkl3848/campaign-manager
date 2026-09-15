import { useState } from 'react';
import ancestries from '../../config/daggerheart/ancestries.json';
import communities from '../../config/daggerheart/communities.json';
import classes from '../../config/daggerheart/classes.json';
import traits from '../../config/daggerheart/traits.json';
import equipment from '../../config/daggerheart/equipment.json';
import type { Character, Traits, TraitId } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { ImageUpload } from '../ui/ImageUpload';

interface CharacterCreatorProps {
  campaignId: string;
  playerId: string;
  playerName: string;
  onSave: (character: Character) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
  existing?: Character;
}

const DEFAULT_TRAITS: Traits = {
  agility: 0,
  strength: 0,
  finesse: 0,
  instinct: 0,
  presence: 0,
  knowledge: 0,
};

export function CharacterCreator({
  campaignId,
  playerId,
  playerName,
  onSave,
  onUploadImage,
  existing,
}: CharacterCreatorProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(existing?.name ?? '');
  const [pronouns, setPronouns] = useState(existing?.pronouns ?? '');
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? '');
  const [ancestryId, setAncestryId] = useState(existing?.ancestryId ?? '');
  const [communityId, setCommunityId] = useState(existing?.communityId ?? '');
  const [classId, setClassId] = useState(existing?.classId ?? '');
  const [subclassId, setSubclassId] = useState(existing?.subclassId ?? '');
  const [characterTraits, setCharacterTraits] = useState<Traits>(existing?.traits ?? { ...DEFAULT_TRAITS });
  const [weaponId, setWeaponId] = useState('');
  const [armorId, setArmorId] = useState(existing?.armorName ? 'custom' : 'none');
  const [saving, setSaving] = useState(false);

  const selectedClass = classes.find((c) => c.id === classId);
  const selectedAncestry = ancestries.find((a) => a.id === ancestryId);
  const traitPointsUsed = Object.values(characterTraits).reduce((a, b) => a + b, 0);
  const TRAIT_BUDGET = 3;

  const updateTrait = (trait: TraitId, delta: number) => {
    const current = characterTraits[trait];
    const newVal = current + delta;
    if (newVal < -1 || newVal > 2) return;
    if (delta > 0 && traitPointsUsed >= TRAIT_BUDGET) return;
    setCharacterTraits((prev) => ({ ...prev, [trait]: newVal }));
  };

  const handleSave = async () => {
    if (!name || !ancestryId || !communityId || !classId || !subclassId) return;
    setSaving(true);

    const cls = classes.find((c) => c.id === classId)!;
    const weapon = equipment.weapons.find((w) => w.id === weaponId);
    const armor = equipment.armor.find((a) => a.id === armorId);

    const character: Character = {
      id: existing?.id ?? crypto.randomUUID(),
      campaignId,
      playerId,
      playerName,
      name,
      pronouns: pronouns || undefined,
      imageUrl: imageUrl || undefined,
      ancestryId,
      communityId,
      classId,
      subclassId,
      traits: characterTraits,
      hp: existing?.hp ?? { current: cls.startingHp, max: cls.startingHp },
      stress: existing?.stress ?? { current: 0, max: cls.startingStress },
      hope: existing?.hope ?? 2,
      evasion: cls.startingEvasion,
      armorScore: armor?.score ?? 0,
      armorName: armor?.name,
      weaponName: weapon?.name,
      weaponDamage: weapon?.damage,
      weaponTrait: weapon?.trait as TraitId | undefined,
      abilities: cls.classFeatures.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
      })),
      inventory: existing?.inventory ?? [],
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    await onSave(character);
    setSaving(false);
  };

  const steps = ['Identity', 'Heritage', 'Class', 'Traits', 'Equipment', 'Review'];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              i === step
                ? 'bg-amber-600 text-white'
                : i < step
                  ? 'bg-amber-900/40 text-amber-300'
                  : 'bg-slate-800 text-slate-500'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <Card title="Who are you?">
          <div className="space-y-4">
            <Input label="Character Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Pronouns" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="they/them" />
            <ImageUpload
              currentUrl={imageUrl}
              label="Character Portrait"
              onUpload={async (file) => {
                const url = await onUploadImage(file);
                setImageUrl(url);
              }}
            />
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card title="Heritage">
          <div className="space-y-4">
            <Select label="Ancestry" value={ancestryId} onChange={(e) => setAncestryId(e.target.value)}>
              <option value="">Choose ancestry...</option>
              {ancestries.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
            {selectedAncestry && (
              <p className="text-sm text-slate-400 bg-slate-900/50 rounded-lg p-3">
                {selectedAncestry.description}
                {selectedAncestry.traitBonus && (
                  <span className="block mt-1 text-amber-400">
                    +{selectedAncestry.traitBonus.value} {selectedAncestry.traitBonus.trait === 'any' ? 'any trait' : selectedAncestry.traitBonus.trait}
                  </span>
                )}
              </p>
            )}
            <Select label="Community" value={communityId} onChange={(e) => setCommunityId(e.target.value)}>
              <option value="">Choose community...</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title="Class">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {classes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setClassId(c.id); setSubclassId(''); }}
                  className={`p-3 rounded-lg text-left transition-all ${
                    classId === c.id
                      ? 'bg-amber-600/30 border-2 border-amber-500'
                      : 'bg-slate-900/50 border border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <p className="font-medium text-slate-100">{c.name}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>
                </button>
              ))}
            </div>
            {selectedClass && (
              <>
                <Select label="Subclass" value={subclassId} onChange={(e) => setSubclassId(e.target.value)}>
                  <option value="">Choose subclass...</option>
                  {selectedClass.subclasses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
                <div className="text-sm text-slate-400 space-y-1">
                  <p>HP: {selectedClass.startingHp} | Stress: {selectedClass.startingStress} | Evasion: {selectedClass.startingEvasion}</p>
                  <p>Domains: {selectedClass.domains.join(', ')}</p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Traits">
          <p className="text-sm text-slate-400 mb-4">
            Assign {TRAIT_BUDGET} points. Range: -1 to +2 per trait.
            <span className="text-amber-400 ml-2">{TRAIT_BUDGET - traitPointsUsed} remaining</span>
          </p>
          <div className="space-y-3">
            {traits.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg px-4 py-3">
                <span className="font-medium text-slate-200">{t.name}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateTrait(t.id as TraitId, -1)}
                    className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-lg font-bold text-amber-400">
                    {characterTraits[t.id as TraitId] >= 0 ? '+' : ''}{characterTraits[t.id as TraitId]}
                  </span>
                  <button
                    onClick={() => updateTrait(t.id as TraitId, 1)}
                    className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card title="Equipment">
          <div className="space-y-4">
            <Select label="Weapon" value={weaponId} onChange={(e) => setWeaponId(e.target.value)}>
              <option value="">Choose weapon...</option>
              {equipment.weapons.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.damage}, {w.trait})
                </option>
              ))}
            </Select>
            <Select label="Armor" value={armorId} onChange={(e) => setArmorId(e.target.value)}>
              {equipment.armor.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.score > 0 ? `(+${a.score})` : ''}
                </option>
              ))}
            </Select>
          </div>
        </Card>
      )}

      {step === 5 && (
        <Card title="Review">
          <div className="space-y-3 text-sm">
            <p><span className="text-slate-400">Name:</span> <span className="text-slate-100 font-medium">{name}</span></p>
            <p><span className="text-slate-400">Ancestry:</span> {ancestries.find((a) => a.id === ancestryId)?.name}</p>
            <p><span className="text-slate-400">Community:</span> {communities.find((c) => c.id === communityId)?.name}</p>
            <p><span className="text-slate-400">Class:</span> {selectedClass?.name} ({selectedClass?.subclasses.find((s) => s.id === subclassId)?.name})</p>
            <div className="flex flex-wrap gap-2">
              {traits.map((t) => (
                <span key={t.id} className="bg-slate-900 rounded px-2 py-1 text-xs">
                  {t.abbreviation}: {characterTraits[t.id as TraitId] >= 0 ? '+' : ''}{characterTraits[t.id as TraitId]}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>Next</Button>
        ) : (
          <Button onClick={handleSave} disabled={saving || !name || !classId}>
            {saving ? 'Saving...' : existing ? 'Update Character' : 'Create Character'}
          </Button>
        )}
      </div>
    </div>
  );
}
