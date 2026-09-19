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
import { toEquippedWeapon } from '../../lib/equipment';
import { formatWeaponDamage } from '../../lib/weaponDamage';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ImageUpload } from '../ui/ImageUpload';
import { GameCard } from '../ui/GameCard';
import { SidePanel } from '../ui/SidePanel';
import { Textarea } from '../ui/Textarea';
import { SubclassStageList } from './SubclassStageList';

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
  const [weaponId, setWeaponId] = useState(
    existing?.primaryWeapon?.equipmentId
      ?? equipment.weapons.find((w) => w.name === existing?.weaponName)?.id
      ?? '',
  );
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

    const proficiency = existing?.proficiency ?? 1;
    const primaryWeapon = weapon
      ? toEquippedWeapon(weapon, proficiency)
      : existing?.primaryWeapon;

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
      primaryWeapon,
      secondaryWeapon: existing?.secondaryWeapon,
      weaponName: primaryWeapon?.name,
      weaponDamage: primaryWeapon?.damage,
      weaponTrait: primaryWeapon?.trait,
      weaponPhysical: primaryWeapon?.physical,
      weaponTwoHanded: primaryWeapon?.twoHanded,
      weaponSecondary: primaryWeapon?.secondary,
      weaponFeature: primaryWeapon?.feature,
      hopeFeature: cls.hopeFeature,
      abilities: cls.classFeatures.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
      })),
      feats: existing?.feats ?? [],
      domainCards,
      experienceEntries: experiences.map((name) => ({ name, bonus: 2 })),
      proficiency,
      thresholdBonus: existing?.thresholdBonus ?? 0,
      markedTraits: existing?.markedTraits ?? [],
      advancementSlots: existing?.advancementSlots ?? {},
      disabledAdvancements: existing?.disabledAdvancements ?? [],
      subclassStage: existing?.subclassStage ?? 'foundation',
      multiclass: existing?.multiclass,
      inventory: existing?.inventory ?? [],
      inParty: existing?.inParty !== false,
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
    <>
    <div className="paper-sheet mx-auto max-w-4xl space-y-6 p-5 sm:p-8">
      <div className="flex gap-1 overflow-x-auto border-b border-ink/20 pb-px">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`creator-step shrink-0 border-b-2 px-3 py-2 text-sm transition-colors ${
              i === step
                ? 'border-oxblood text-oxblood'
                : i < step
                  ? 'border-transparent text-ink-muted hover:text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <span className="mr-1 text-xs text-ink-muted">{i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <section>
          <h2 className="sheet-heading">Who are you?</h2>
          <div className="space-y-4">
            <Input label="Character Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <ImageUpload
              currentUrl={imageUrl}
              frame="portrait"
              label="Character Portrait"
              onUpload={async (file) => {
                const url = await onUploadImage(file);
                setImageUrl(url);
              }}
            />
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <h2 className="sheet-heading">Choose Your Class</h2>
          <p className="mb-4 font-serif text-sm text-ink-muted">
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
                  <p><span className="text-oxblood">HP</span> {c.startingHp} · <span className="text-oxblood">Evade</span> {c.startingEvasion}</p>
                  <p><span className="text-oxblood">Domains:</span> {c.domains.map(domainName).join(', ')}</p>
                  <p className="line-clamp-2">{c.hopeFeature}</p>
                </div>
              </GameCard>
            ))}
          </div>
          {selectedClass && (
            <p className="mt-4 font-serif text-sm text-ink">
              Selected: <strong>{selectedClass.name}</strong>
              {subclassId && ` — ${selectedClass.subclasses.find((s) => s.id === subclassId)?.name}`}
            </p>
          )}
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 className="sheet-heading">Choose Your Ancestry</h2>
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
                <p className="mb-2 line-clamp-2">{a.description}</p>
                <ul className="space-y-0.5">
                  {a.abilities.map((ab) => (
                    <li key={ab} className="flex gap-1">
                      <span className="text-oxblood">•</span>
                      <span>{ab}</span>
                    </li>
                  ))}
                </ul>
              </GameCard>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 className="sheet-heading">Choose Your Community</h2>
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
                <p className="mb-2">{c.description}</p>
                <p>{c.feature}</p>
              </GameCard>
            ))}
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <h2 className="sheet-heading">Transformation (Optional)</h2>
          <p className="mb-4 font-serif text-sm text-ink-muted">
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
                <p className="mb-2">{t.description}</p>
                <ul className="space-y-0.5">
                  {t.abilities.map((ab) => (
                    <li key={ab.name}>
                      <span className="text-oxblood">{ab.name}:</span> {ab.description}
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
        </section>
      )}

      {step === 5 && (
        <section>
          <h2 className="sheet-heading">Assign Traits</h2>
          <p className="mb-4 font-serif text-sm text-ink-muted">
            Assign {TRAIT_BUDGET} points across your traits. Range: −1 to +2 per trait.
            {selectedAncestry?.traitBonus && (
              <span className="mt-1 block text-oxblood">
                Ancestry bonus: +{selectedAncestry.traitBonus.value}{' '}
                {selectedAncestry.traitBonus.trait === 'any' ? 'to any trait (apply manually)' : selectedAncestry.traitBonus.trait}
              </span>
            )}
            <span className="ml-2 text-oxblood">{TRAIT_BUDGET - traitPointsUsed} remaining</span>
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
          <div className="space-y-2">
            {traits.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-ink/15 py-2">
                <span className="font-display tracking-wide text-ink">{t.name}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateTrait(t.id as TraitId, -1)}
                    className="flex h-8 w-8 items-center justify-center border border-ink/25 text-ink hover:bg-black/5"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-display text-xl font-semibold text-ink">
                    {characterTraits[t.id as TraitId] >= 0 ? '+' : ''}
                    {characterTraits[t.id as TraitId]}
                    {humanBonusTrait === t.id && <span className="text-xs text-oxblood"> +1</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateTrait(t.id as TraitId, 1)}
                    className="flex h-8 w-8 items-center justify-center border border-ink/25 text-ink hover:bg-black/5"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 6 && (
        <section>
          <h2 className="sheet-heading">Experiences</h2>
          <p className="mb-4 font-serif text-sm text-ink-muted">
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
        </section>
      )}

      {step === 7 && (
        <section>
          <h2 className="sheet-heading">Equipment</h2>
          <div className="space-y-4">
            <Select label="Primary Weapon" value={weaponId} onChange={(e) => setWeaponId(e.target.value)}>
              <option value="">Choose weapon...</option>
              {equipment.weapons.filter((w) => !w.secondary).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatWeaponDamage({ dice: w.damage.dice, count: 1, modifier: w.damage.modifier })}, {w.trait})
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
        </section>
      )}

      {step === 8 && (
        <section>
          <h2 className="sheet-heading">Choose Domain Cards</h2>
          <p className="mb-4 font-serif text-sm text-ink-muted">
            Pick two level 1 domain cards from your class domains ({selectedClass?.domains.map(domainName).join(' & ')}).
            <span className="ml-2 text-oxblood">{selectedDomainCardIds.length}/2 selected</span>
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
                  className={`border p-3 text-left transition-colors ${
                    selected
                      ? 'border-oxblood bg-oxblood/8'
                      : 'border-ink/20 hover:border-ink/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs uppercase tracking-wider text-ink-faint">{domain?.name}</span>
                    <span className="font-display text-xs text-oxblood">Lv.{card.level}</span>
                  </div>
                  <p className="mt-1 font-display font-semibold text-ink">{card.name}</p>
                  <p className="mt-1 line-clamp-2 font-serif text-xs text-ink-muted">{card.description}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 9 && (
        <section>
          <h2 className="sheet-heading">Character Description</h2>
          <Textarea
            label="Describe your character"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Appearance, personality, backstory, goals..."
            rows={6}
          />
          <div className="mt-6 space-y-2 border border-ink/15 bg-black/[0.03] p-4 font-serif text-sm">
            <h4 className="font-display text-lg tracking-wide text-oxblood">Summary</h4>
            <p><span className="text-ink-muted">Name:</span> {name}</p>
            <p><span className="text-ink-muted">Class:</span> {selectedClass?.name} ({selectedClass?.subclasses.find((s) => s.id === subclassId)?.name})</p>
            <p><span className="text-ink-muted">Ancestry:</span> {selectedAncestry?.name}</p>
            <p><span className="text-ink-muted">Community:</span> {communities.find((c) => c.id === communityId)?.name}</p>
            {transformationId && (
              <p><span className="text-ink-muted">Transformation:</span> {transformations.find((t) => t.id === transformationId)?.name}</p>
            )}
          </div>
        </section>
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
            <p className="font-serif text-ink">{panelClass.description}</p>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="HP" value={String(panelClass.startingHp)} />
              <Stat label="Stress" value={String(panelClass.startingStress)} />
              <Stat label="Evasion" value={String(panelClass.startingEvasion)} />
              <Stat label="Domains" value={panelClass.domains.map(domainName).join(', ')} />
            </div>

            <div>
              <h4 className="mb-1 font-display text-lg tracking-wide text-oxblood">Hope Feature</h4>
              <p className="font-serif text-ink">{panelClass.hopeFeature}</p>
            </div>

            <div>
              <h4 className="mb-2 font-display text-lg tracking-wide text-oxblood">Class Features</h4>
              <div className="space-y-2">
                {panelClass.classFeatures.map((f) => (
                  <div key={f.id} className="border-b border-ink/15 pb-2">
                    <p className="font-display font-semibold text-ink">{f.name}</p>
                    <p className="font-serif text-ink">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-display text-lg tracking-wide text-oxblood">Subclasses</h4>
              <div className="space-y-3">
                {panelClass.subclasses.map((s) => (
                  <div
                    key={s.id}
                    className={`p-3 ${panelSubclassId === s.id ? 'border border-oxblood/50 bg-oxblood/8' : 'border border-ink/15'}`}
                  >
                    <p className="font-display font-semibold text-ink">{s.name}</p>
                    <p className="mb-2 font-serif text-ink">{s.description}</p>
                    <SubclassStageList subclass={s} inspect compact />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SidePanel>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink/15 p-3 text-center">
      <p className="font-sans text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="font-display font-semibold text-ink">{value}</p>
    </div>
  );
}
