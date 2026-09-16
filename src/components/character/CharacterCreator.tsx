import { useState } from 'react';
import ancestries from '../../config/daggerheart/ancestries.json';
import communities from '../../config/daggerheart/communities.json';
import classes from '../../config/daggerheart/classes.json';
import traits from '../../config/daggerheart/traits.json';
import equipment from '../../config/daggerheart/equipment.json';
import transformations from '../../config/daggerheart/transformations.json';
import domains from '../../config/daggerheart/domains.json';
import domainCardsCatalog from '../../config/daggerheart/domain-cards.json';
import type { Character, Traits, TraitId, DomainCard } from '../../types';
import { computeArmorStats } from '../../lib/characterArmor';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { ImageUpload } from '../ui/ImageUpload';
import { GameCard } from '../ui/GameCard';
import { SidePanel } from '../ui/SidePanel';
import { Textarea } from '../ui/Textarea';

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

const STEPS = [
  'Who are you?',
  'Class',
  'Ancestry',
  'Community',
  'Transformation',
  'Traits',
  'Experience',
  'Equipment',
  'Domain Cards',
  'Description',
];

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
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? '');
  const [ancestryId, setAncestryId] = useState(existing?.ancestryId ?? '');
  const [communityId, setCommunityId] = useState(existing?.communityId ?? '');
  const [classId, setClassId] = useState(existing?.classId ?? '');
  const [subclassId, setSubclassId] = useState(existing?.subclassId ?? '');
  const [transformationId, setTransformationId] = useState(existing?.transformationId ?? '');
  const [characterTraits, setCharacterTraits] = useState<Traits>(existing?.traits ?? { ...DEFAULT_TRAITS });
  const [humanBonusTrait, setHumanBonusTrait] = useState<TraitId | ''>('');
  const [experiences, setExperiences] = useState<[string, string]>(() => {
    if (existing?.experienceEntries?.length) {
      const entries = existing.experienceEntries.filter((e) => e.name.trim());
      return [entries[0]?.name ?? '', entries[1]?.name ?? ''];
    }
    if (existing?.experiences?.length === 2) {
      return [existing.experiences[0] ?? '', existing.experiences[1] ?? ''];
    }
    return ['', ''];
  });
  const [selectedDomainCardIds, setSelectedDomainCardIds] = useState<string[]>(
    existing?.domainCards?.map((c) => c.id) ?? [],
  );
  const [weaponId, setWeaponId] = useState('');
  const [armorId, setArmorId] = useState(existing?.armorId ?? 'none');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [classPanelId, setClassPanelId] = useState<string | null>(null);
  const [panelSubclassId, setPanelSubclassId] = useState('');

  const selectedClass = classes.find((c) => c.id === classId);
  const selectedAncestry = ancestries.find((a) => a.id === ancestryId);
  const panelClass = classes.find((c) => c.id === classPanelId);
  const traitPointsUsed = Object.values(characterTraits).reduce((a, b) => a + b, 0);
  const TRAIT_BUDGET = 3;

  const updateTrait = (trait: TraitId, delta: number) => {
    const current = characterTraits[trait];
    const newVal = current + delta;
    if (newVal < -1 || newVal > 2) return;
    if (delta > 0 && traitPointsUsed >= TRAIT_BUDGET) return;
    setCharacterTraits((prev) => ({ ...prev, [trait]: newVal }));
  };

  const updateExperience = (index: 0 | 1, value: string) => {
    setExperiences((prev) => {
      const next = [...prev] as [string, string];
      next[index] = value;
      return next;
    });
  };

  const availableDomainCards = selectedClass
    ? domainCardsCatalog.filter(
        (c) => selectedClass.domains.includes(c.domain) && c.level <= 1,
      )
    : [];

  const toggleDomainCard = (id: string) => {
    setSelectedDomainCardIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const openClassPanel = (id: string) => {
    setClassPanelId(id);
    setPanelSubclassId(id === classId ? subclassId : '');
  };

  const confirmClassSelection = () => {
    if (!classPanelId || !panelSubclassId) return;
    setClassId(classPanelId);
    setSubclassId(panelSubclassId);
    setClassPanelId(null);
  };

  const handleSave = async () => {
    if (!name || !ancestryId || !communityId || !classId || !subclassId) return;
    setSaving(true);

    const cls = classes.find((c) => c.id === classId)!;
    const weapon = equipment.weapons.find((w) => w.id === weaponId);
    const armor = equipment.armor.find((a) => a.id === armorId);
    const level = existing?.level ?? 1;
    const armorStats = computeArmorStats(armorId, level);

    const domainCards: DomainCard[] = selectedDomainCardIds.map((id) => {
      const card = domainCardsCatalog.find((c) => c.id === id)!;
      return {
        id: card.id,
        domainId: card.domain,
        level: card.level,
        name: card.name,
        description: card.description,
        type: card.type,
        recallCost: card.recallCost,
      };
    });

    const character: Character = {
      id: existing?.id ?? crypto.randomUUID(),
      campaignId,
      playerId,
      playerName,
      name,
      imageUrl: imageUrl || undefined,
      ancestryId,
      communityId,
      classId,
      subclassId,
      transformationId: transformationId || undefined,
      traits: characterTraits,
      level,
      hp: existing?.hp ?? { current: cls.startingHp, max: cls.startingHp },
      stress: existing?.stress ?? { current: 0, max: cls.startingStress },
      hope: existing?.hope ?? 2,
      evasion: cls.startingEvasion,
      armorId,
      armorScore: armorStats.armorScore,
      armorName: armor?.name,
      armorSlots: existing?.armorSlots ?? armorStats.armorSlots,
      damageThresholds: armorStats.damageThresholds,
      weaponName: weapon?.name,
      weaponDamage: weapon?.damage,
      weaponTrait: weapon?.trait as TraitId | undefined,
      hopeFeature: cls.hopeFeature,
      abilities: cls.classFeatures.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
      })),
      feats: existing?.feats ?? [],
      domainCards,
      experienceEntries: experiences.map((name) => ({ name, bonus: 2 })),
      proficiency: existing?.proficiency ?? 1,
      thresholdBonus: existing?.thresholdBonus ?? 0,
      markedTraits: existing?.markedTraits ?? [],
      advancementSlots: existing?.advancementSlots ?? {},
      disabledAdvancements: existing?.disabledAdvancements ?? [],
      subclassStage: existing?.subclassStage ?? 'foundation',
      multiclass: existing?.multiclass,
      inventory: existing?.inventory ?? [],
      description: description || undefined,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    await onSave(character);
    setSaving(false);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!name;
      case 1: return !!classId && !!subclassId;
      case 2: return !!ancestryId;
      case 3: return !!communityId;
      case 4: return true;
      case 5: return traitPointsUsed === TRAIT_BUDGET;
      case 6: return experiences.every((e) => e.trim());
      case 7: return true;
      case 8: return selectedDomainCardIds.length === 2;
      case 9: return true;
      default: return true;
    }
  };

  const domainName = (id: string) => domains.find((d) => d.id === id)?.name ?? id;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              i === step
                ? 'bg-amber-600 text-white'
                : i < step
                  ? 'bg-amber-900/40 text-amber-300'
                  : 'bg-slate-800 text-slate-500'
            }`}
          >
            <span className="mr-1 opacity-60">{i + 1}.</span>
            {s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <Card title="Who are you?">
          <div className="space-y-4">
            <Input label="Character Name" value={name} onChange={(e) => setName(e.target.value)} required />
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
        <Card title="Choose Your Class">
          <p className="mb-4 text-sm text-slate-400">
            Click a card to view full class details and select a subclass.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {classes.map((c) => (
              <GameCard
                key={c.id}
                id={c.id}
                folder="classes"
                title={c.name}
                selected={classId === c.id}
                onClick={() => openClassPanel(c.id)}
              >
                <div className="space-y-1">
                  <p><span className="text-amber-400">HP</span> {c.startingHp} · <span className="text-amber-400">Evade</span> {c.startingEvasion}</p>
                  <p><span className="text-amber-400">Domains:</span> {c.domains.map(domainName).join(', ')}</p>
                  <p className="line-clamp-2 text-slate-400">{c.hopeFeature}</p>
                </div>
              </GameCard>
            ))}
          </div>
          {selectedClass && (
            <p className="mt-4 text-sm text-amber-300">
              Selected: <strong>{selectedClass.name}</strong>
              {subclassId && ` — ${selectedClass.subclasses.find((s) => s.id === subclassId)?.name}`}
            </p>
          )}
        </Card>
      )}

      {step === 2 && (
        <Card title="Choose Your Ancestry">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ancestries.map((a) => (
              <GameCard
                key={a.id}
                id={a.id}
                folder="ancestries"
                title={a.name}
                selected={ancestryId === a.id}
                onClick={() => setAncestryId(a.id)}
              >
                <p className="mb-2 line-clamp-2 text-slate-400">{a.description}</p>
                <ul className="space-y-0.5 text-slate-300">
                  {a.abilities.map((ab) => (
                    <li key={ab} className="flex gap-1">
                      <span className="text-amber-500">•</span>
                      <span>{ab}</span>
                    </li>
                  ))}
                </ul>
              </GameCard>
            ))}
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Choose Your Community">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {communities.map((c) => (
              <GameCard
                key={c.id}
                id={c.id}
                folder="communities"
                title={c.name}
                selected={communityId === c.id}
                onClick={() => setCommunityId(c.id)}
              >
                <p className="mb-2 text-slate-400">{c.description}</p>
                <p className="text-slate-300">{c.feature}</p>
              </GameCard>
            ))}
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card title="Transformation (Optional)">
          <p className="mb-4 text-sm text-slate-400">
            Some characters carry a supernatural transformation. You can skip this step.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {transformations.map((t) => (
              <GameCard
                key={t.id}
                id={t.id}
                folder="transformations"
                title={t.name}
                selected={transformationId === t.id}
                onClick={() => setTransformationId(transformationId === t.id ? '' : t.id)}
              >
                <p className="mb-2 text-slate-400">{t.description}</p>
                <ul className="space-y-0.5">
                  {t.abilities.map((ab) => (
                    <li key={ab.name} className="text-slate-300">
                      <span className="text-amber-400">{ab.name}:</span> {ab.description}
                    </li>
                  ))}
                </ul>
              </GameCard>
            ))}
          </div>
          {transformationId && (
            <Button variant="ghost" className="mt-4" onClick={() => setTransformationId('')}>
              Clear transformation
            </Button>
          )}
        </Card>
      )}

      {step === 5 && (
        <Card title="Assign Traits">
          <p className="mb-4 text-sm text-slate-400">
            Assign {TRAIT_BUDGET} points across your traits. Range: −1 to +2 per trait.
            {selectedAncestry?.traitBonus && (
              <span className="mt-1 block text-amber-400">
                Ancestry bonus: +{selectedAncestry.traitBonus.value}{' '}
                {selectedAncestry.traitBonus.trait === 'any' ? 'to any trait (apply manually)' : selectedAncestry.traitBonus.trait}
              </span>
            )}
            <span className="ml-2 text-amber-400">{TRAIT_BUDGET - traitPointsUsed} remaining</span>
          </p>
          {selectedAncestry?.traitBonus?.trait === 'any' && (
            <Select
              label="Human Versatility — bonus trait"
              value={humanBonusTrait}
              onChange={(e) => setHumanBonusTrait(e.target.value as TraitId)}
              className="mb-4"
            >
              <option value="">Choose trait for +1...</option>
              {traits.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          )}
          <div className="space-y-3">
            {traits.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-slate-900/50 px-4 py-3">
                <span className="font-medium text-slate-200">{t.name}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateTrait(t.id as TraitId, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded bg-slate-700 text-slate-200 hover:bg-slate-600"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-lg font-bold text-amber-400">
                    {characterTraits[t.id as TraitId] >= 0 ? '+' : ''}
                    {characterTraits[t.id as TraitId]}
                    {humanBonusTrait === t.id && <span className="text-xs text-green-400"> +1</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateTrait(t.id as TraitId, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded bg-slate-700 text-slate-200 hover:bg-slate-600"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {step === 6 && (
        <Card title="Experiences">
          <p className="mb-4 text-sm text-slate-400">
            Choose two experiences that define your character's background. Spend Hope to add +2 to a related roll.
          </p>
          <div className="space-y-4">
            {([0, 1] as const).map((i) => (
              <Input
                key={i}
                label={`Experience ${i + 1}`}
                value={experiences[i]}
                onChange={(e) => updateExperience(i, e.target.value)}
                placeholder="e.g. Raised by Wolves, Former Soldier..."
              />
            ))}
          </div>
        </Card>
      )}

      {step === 7 && (
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

      {step === 8 && (
        <Card title="Choose Domain Cards">
          <p className="mb-4 text-sm text-slate-400">
            Pick two level 1 domain cards from your class domains ({selectedClass?.domains.map(domainName).join(' & ')}).
            <span className="ml-2 text-amber-400">{selectedDomainCardIds.length}/2 selected</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {availableDomainCards.map((card) => {
              const selected = selectedDomainCardIds.includes(card.id);
              const domain = domains.find((d) => d.id === card.domain);
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => toggleDomainCard(card.id)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    selected
                      ? 'border-amber-500 bg-amber-900/30'
                      : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase text-slate-500">{domain?.name}</span>
                    <span className="text-xs text-amber-400">Lv.{card.level}</span>
                  </div>
                  <p className="mt-1 font-medium text-slate-200">{card.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">{card.description}</p>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {step === 9 && (
        <Card title="Character Description">
          <Textarea
            label="Describe your character"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Appearance, personality, backstory, goals..."
            rows={6}
          />
          <div className="mt-6 space-y-2 rounded-lg bg-slate-900/50 p-4 text-sm">
            <h4 className="font-serif text-amber-300">Summary</h4>
            <p><span className="text-slate-400">Name:</span> {name}</p>
            <p><span className="text-slate-400">Class:</span> {selectedClass?.name} ({selectedClass?.subclasses.find((s) => s.id === subclassId)?.name})</p>
            <p><span className="text-slate-400">Ancestry:</span> {selectedAncestry?.name}</p>
            <p><span className="text-slate-400">Community:</span> {communities.find((c) => c.id === communityId)?.name}</p>
            {transformationId && (
              <p><span className="text-slate-400">Transformation:</span> {transformations.find((t) => t.id === transformationId)?.name}</p>
            )}
          </div>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving || !canProceed()}>
            {saving ? 'Saving...' : existing ? 'Update Character' : 'Create Character'}
          </Button>
        )}
      </div>

      <SidePanel
        open={!!panelClass}
        onClose={() => setClassPanelId(null)}
        title={panelClass?.name ?? ''}
        footer={
          panelClass && (
            <div className="space-y-3">
              <Select
                label="Subclass"
                value={panelSubclassId}
                onChange={(e) => setPanelSubclassId(e.target.value)}
              >
                <option value="">Choose subclass...</option>
                {panelClass.subclasses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <Button onClick={confirmClassSelection} disabled={!panelSubclassId} className="w-full">
                Select {panelClass.name}
              </Button>
            </div>
          )
        }
      >
        {panelClass && (
          <div className="space-y-5 text-sm">
            <p className="text-slate-300">{panelClass.description}</p>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="HP" value={String(panelClass.startingHp)} />
              <Stat label="Stress" value={String(panelClass.startingStress)} />
              <Stat label="Evasion" value={String(panelClass.startingEvasion)} />
              <Stat label="Domains" value={panelClass.domains.map(domainName).join(', ')} />
            </div>

            <div>
              <h4 className="mb-1 font-serif text-amber-300">Hope Feature</h4>
              <p className="text-slate-300">{panelClass.hopeFeature}</p>
            </div>

            <div>
              <h4 className="mb-2 font-serif text-amber-300">Class Features</h4>
              <div className="space-y-2">
                {panelClass.classFeatures.map((f) => (
                  <div key={f.id} className="rounded-lg bg-slate-800/60 p-3">
                    <p className="font-medium text-slate-200">{f.name}</p>
                    <p className="text-slate-400">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-serif text-amber-300">Subclasses</h4>
              <div className="space-y-3">
                {panelClass.subclasses.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-lg p-3 ${panelSubclassId === s.id ? 'border border-amber-500/50 bg-amber-900/20' : 'bg-slate-800/60'}`}
                  >
                    <p className="font-medium text-slate-200">{s.name}</p>
                    <p className="mb-2 text-slate-400">{s.description}</p>
                    <ul className="space-y-1">
                      {s.features.map((feat) => (
                        <li key={feat} className="flex gap-1 text-slate-300">
                          <span className="text-amber-500">•</span>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/60 p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-bold text-slate-200">{value}</p>
    </div>
  );
}
