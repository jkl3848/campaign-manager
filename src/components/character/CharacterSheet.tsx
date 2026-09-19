import { useState, useEffect, useRef, useMemo } from 'react';
import type { Character, DomainCard, Ability, TraitId, EquipmentKind } from '../../types';
import { LevelUpWizard } from './LevelUpWizard';
import { canInitiateLevelUp, cancelLevelUp, initiateLevelUp, getTierForLevel } from '../../lib/levelUp';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ImageUpload } from '../ui/ImageUpload';
import { TickTrack } from '../ui/TickTrack';
import { DomainCardHand } from './DomainCardHand';
import { SubclassStageList } from './SubclassStageList';
import { EquipmentPanel } from './EquipmentPanel';
import { getSubclassTracks, stageLabel } from '../../lib/subclasses';
import traits from '../../config/daggerheart/traits.json';
import classes from '../../config/daggerheart/classes.json';
import ancestries from '../../config/daggerheart/ancestries.json';
import communities from '../../config/daggerheart/communities.json';
import transformations from '../../config/daggerheart/transformations.json';
import domains from '../../config/daggerheart/domains.json';
import domainCardsCatalog from '../../config/daggerheart/domain-cards.json';
import { normalizeCharacter } from '../../lib/characterNormalize';
import { CHARACTER_HOPE_MAX, clampHope } from '../../lib/hopeFear';
import {
  addCatalogToInventory,
  equipArmorFromInventory,
  equipWeaponFromInventory,
  listCatalogEntries,
  removeFromInventory,
  unequipArmor,
  unequipWeapon,
} from '../../lib/equipment';
import { CharacterSheetSession } from './CharacterSheetSession';

export type CharacterSheetLayout = 'full' | 'session';

interface CharacterSheetProps {
  character: Character;
  onSave: (character: Character) => Promise<void>;
  onUploadImage?: (file: File) => Promise<string>;
  canEdit?: boolean;
  isDm?: boolean;
  /** @deprecated Use layout="session" instead */
  compact?: boolean;
  layout?: CharacterSheetLayout;
  onTraitRoll?: (traitName: string, modifier: number) => void;
  onWeaponAttack?: (label: string, modifier: number) => void;
  onWeaponDamage?: (label: string, count: number, sides: number, modifier: number) => void;
}

export function CharacterSheet({
  character,
  onSave,
  onUploadImage,
  canEdit = true,
  isDm = false,
  compact = false,
  layout = 'full',
  onTraitRoll,
  onWeaponAttack,
  onWeaponDamage,
}: CharacterSheetProps) {
  const [char, setChar] = useState(() => normalizeCharacter(character));
  const [saving, setSaving] = useState(false);
  const [showLevelUpWizard, setShowLevelUpWizard] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charRef = useRef(char);
  const effectiveLayout = compact ? 'session' : layout;
  const isSession = effectiveLayout === 'session';

  const catalogOptions = useMemo(
    () => listCatalogEntries(getTierForLevel(char.level)),
    [char.level],
  );

  useEffect(() => {
    const next = normalizeCharacter(character);
    charRef.current = next;
    setChar(next);
  }, [character]);

  useEffect(() => {
    charRef.current = char;
  }, [char]);

  useEffect(() => {
    return () => {
      if (notesTimer.current) clearTimeout(notesTimer.current);
    };
  }, []);

  const cls = classes.find((c) => c.id === char.classId);
  const ancestry = ancestries.find((a) => a.id === char.ancestryId);
  const community = communities.find((c) => c.id === char.communityId);
  const transformation = transformations.find((t) => t.id === char.transformationId);
  const subclass = cls?.subclasses.find((s) => s.id === char.subclassId);
  const hopeFeature = char.hopeFeature ?? cls?.hopeFeature;

  const persist = async (next: Character) => {
    setSaving(true);
    await onSave({ ...next, updatedAt: Date.now() });
    setSaving(false);
  };

  /** Immediate persist for live resources (HP, stress, hope, inventory, armor). */
  const updateLive = (partial: Partial<Character>) => {
    const next = { ...charRef.current, ...partial };
    charRef.current = next;
    setChar(next);
    void persist(next);
  };

  /** Local-only update; requires Save on the full character page. */
  const updateLocal = (partial: Partial<Character>) => {
    const next = { ...charRef.current, ...partial };
    charRef.current = next;
    setChar(next);
  };

  const adjustHp = (delta: number) => {
    const current = Math.max(0, Math.min(char.hp.max, char.hp.current + delta));
    updateLive({ hp: { ...char.hp, current } });
  };

  const adjustStress = (delta: number) => {
    const current = Math.max(0, Math.min(char.stress.max, char.stress.current + delta));
    updateLive({ stress: { ...char.stress, current } });
  };

  const adjustHope = (delta: number) => {
    updateLive({ hope: clampHope(char.hope + delta) });
  };

  /** Structural overrides — local until Save on the character page. */
  const adjustMaxHp = (delta: number) => {
    const max = Math.max(1, char.hp.max + delta);
    updateLocal({ hp: { current: Math.min(char.hp.current, max), max } });
  };

  const adjustMaxStress = (delta: number) => {
    const max = Math.max(1, char.stress.max + delta);
    updateLocal({ stress: { current: Math.min(char.stress.current, max), max } });
  };

  const adjustEvasion = (delta: number) => {
    updateLocal({ evasion: Math.max(0, char.evasion + delta) });
  };

  const adjustArmorScore = (delta: number) => {
    updateLocal({ armorScore: Math.max(0, char.armorScore + delta) });
  };

  const adjustThreshold = (key: 'major' | 'severe', delta: number) => {
    updateLocal({
      damageThresholds: {
        ...char.damageThresholds,
        [key]: Math.max(0, char.damageThresholds[key] + delta),
      },
    });
  };

  const adjustTrait = (traitId: TraitId, delta: number) => {
    updateLocal({
      traits: { ...char.traits, [traitId]: char.traits[traitId] + delta },
    });
  };

  const toggleTraitMark = (traitId: TraitId) => {
    const marked = char.markedTraits.includes(traitId);
    updateLocal({
      markedTraits: marked
        ? char.markedTraits.filter((t) => t !== traitId)
        : [...char.markedTraits, traitId],
    });
  };

  const handleDmLevelUp = async () => {
    if (!canInitiateLevelUp(char)) return;
    const updated = initiateLevelUp(char);
    setChar(updated);
    await persist(updated);
  };

  const handleCancelLevelUp = async () => {
    const updated = cancelLevelUp(char);
    setChar(updated);
    await persist(updated);
  };

  const handleLevelUpComplete = async (updated: Character) => {
    setChar(updated);
    setShowLevelUpWizard(false);
    await persist(updated);
  };

  const toggleArmorSlot = (index: number) => {
    const marked = char.armorSlots.marked;
    const max = char.armorSlots.max;
    let nextMarked = marked;
    if (index < marked) {
      nextMarked = marked - 1;
    } else if (index === marked && marked < max) {
      nextMarked = marked + 1;
    } else {
      return;
    }
    updateLive({ armorSlots: { marked: nextMarked, max } });
  };

  const addCatalogItem = (key: string) => {
    const sep = key.indexOf(':');
    if (sep < 0) return;
    const kind = key.slice(0, sep) as EquipmentKind;
    const id = key.slice(sep + 1);
    const entry = catalogOptions.find((e) => e.id === id && e.kind === kind);
    if (!entry) return;
    updateLive({ inventory: addCatalogToInventory(charRef.current.inventory, entry) });
  };

  const handleEquipWeapon = (inventoryItemId: string, slot: 'primary' | 'secondary') => {
    updateLive(equipWeaponFromInventory(charRef.current, inventoryItemId, slot));
  };

  const handleUnequipWeapon = (slot: 'primary' | 'secondary') => {
    updateLive(unequipWeapon(charRef.current, slot));
  };

  const handleEquipArmor = (inventoryItemId: string) => {
    updateLive(equipArmorFromInventory(charRef.current, inventoryItemId));
  };

  const handleUnequipArmor = () => {
    updateLive(unequipArmor(charRef.current));
  };

  const handleRemoveInventoryItem = (inventoryItemId: string) => {
    updateLive({
      inventory: removeFromInventory(charRef.current.inventory, inventoryItemId),
    });
  };

  const addDomainCard = (cardId: string) => {
    const catalog = domainCardsCatalog.find((c) => c.id === cardId);
    if (!catalog || char.domainCards.some((c) => c.id === cardId)) return;
    const card: DomainCard = {
      id: catalog.id,
      domainId: catalog.domain,
      level: catalog.level,
      name: catalog.name,
      description: catalog.description,
      type: catalog.type,
      recallCost: catalog.recallCost,
    };
    // Domain cards are structural — auto-save in session, local until Save on character page
    if (isSession) {
      updateLive({ domainCards: [...char.domainCards, card] });
    } else {
      updateLocal({ domainCards: [...char.domainCards, card] });
    }
  };

  const removeDomainCard = (cardId: string) => {
    const domainCards = charRef.current.domainCards.filter((c) => c.id !== cardId);
    if (isSession) {
      updateLive({ domainCards });
    } else {
      updateLocal({ domainCards });
    }
  };

  const handleNotesChange = (notes: string) => {
    setChar((prev) => {
      const next = { ...prev, notes };
      charRef.current = next;
      return next;
    });
    if (!isSession) return;
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      void persist(charRef.current);
    }, 500);
  };

  const handleSave = async () => {
    await persist(char);
  };

  const availableDomainCardsForDm = cls
    ? domainCardsCatalog.filter(
        (c) => cls.domains.includes(c.domain) && c.level <= char.level && !char.domainCards.some((dc) => dc.id === c.id),
      )
    : [];

  if (isSession) {
    return (
      <CharacterSheetSession
        char={char}
        canEdit={canEdit}
        isDm={isDm}
        saving={saving}
        cls={cls}
        ancestry={ancestry}
        community={community}
        transformation={transformation}
        subclass={subclass}
        hopeFeature={hopeFeature}
        availableDomainCardsForDm={availableDomainCardsForDm}
        onAdjustHp={adjustHp}
        onAdjustStress={adjustStress}
        onAdjustHope={adjustHope}
        onToggleArmorSlot={toggleArmorSlot}
        onUpdateNotes={handleNotesChange}
        onDmLevelUp={handleDmLevelUp}
        onCancelLevelUp={handleCancelLevelUp}
        onLevelUpComplete={handleLevelUpComplete}
        onAddDomainCard={addDomainCard}
        onRemoveDomainCard={canEdit ? removeDomainCard : undefined}
        catalogOptions={catalogOptions}
        onAddCatalogItem={addCatalogItem}
        onEquipWeapon={handleEquipWeapon}
        onUnequipWeapon={handleUnequipWeapon}
        onEquipArmor={handleEquipArmor}
        onUnequipArmor={handleUnequipArmor}
        onRemoveInventoryItem={handleRemoveInventoryItem}
        onTraitRoll={onTraitRoll}
        onWeaponAttack={onWeaponAttack}
        onWeaponDamage={onWeaponDamage}
      />
    );
  }

  return (
    <div className="paper-sheet space-y-6 p-5 sm:p-8">
      {char.pendingLevelUp && (
        <div className="border border-oxblood/40 bg-oxblood/8 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-lg font-semibold tracking-wide text-oxblood">
                Level Up Available
              </p>
              <p className="font-serif text-sm text-ink-muted">
                {isDm ? 'You initiated a level up to' : 'Your DM has granted a level up to'}{' '}
                <span className="font-semibold text-ink">Level {char.pendingLevelUp.targetLevel}</span>.
                {canEdit ? ' Complete your advancement choices to finalize.' : ' Waiting for the player to complete.'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {canEdit && (
                <Button onClick={() => setShowLevelUpWizard(true)}>
                  Complete Level Up
                </Button>
              )}
              {isDm && (
                <Button variant="ghost" size="sm" onClick={handleCancelLevelUp} disabled={saving}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {showLevelUpWizard && char.pendingLevelUp && (
        <LevelUpWizard
          character={char}
          onComplete={handleLevelUpComplete}
          onCancel={() => setShowLevelUpWizard(false)}
        />
      )}

      <div className="sheet-header">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="shrink-0">
            {onUploadImage && canEdit ? (
              <ImageUpload
                currentUrl={char.imageUrl}
                frame="portrait"
                onUpload={async (file) => {
                  const url = await onUploadImage(file);
                  updateLocal({ imageUrl: url });
                }}
              />
            ) : char.imageUrl ? (
              <div className="h-32 w-28 rotate-[-1.5deg] bg-parchment p-1.5 shadow-md">
                <img
                  src={char.imageUrl}
                  alt={char.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-32 w-28 rotate-[-1.5deg] items-center justify-center border border-dashed border-ink/25 bg-black/5">
                <span className="font-display text-4xl text-oxblood/50">{char.name.charAt(0)}</span>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            {canEdit ? (
              <Input label="Name" value={char.name} onChange={(e) => updateLocal({ name: e.target.value })} />
            ) : (
              <h1 className="font-display text-4xl font-semibold tracking-wide text-ink">{char.name}</h1>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 font-bold">
              <LevelBadge level={char.level} />
              {isDm && canInitiateLevelUp(char) && (
                <Button size="sm" onClick={handleDmLevelUp} disabled={saving}>
                  Level Up
                </Button>
              )}
              {cls && <Tag label={cls.name}/>}
              {subclass && (
                <Tag label={`${subclass.name} (${stageLabel(char.subclassStage)})`} variant="subtle" />
              )}
              {char.multiclass && (
                <Tag
                  label={`MC: ${classes.find((c) => c.id === char.multiclass!.classId)?.name ?? char.multiclass.classId}${
                    char.multiclass.subclassId
                      ? ` · ${stageLabel(char.multiclass.subclassStage ?? 'foundation')}`
                      : ''
                  }`}
                  variant="accent"
                />
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-sans text-xs font-semibold uppercase tracking-wide text-ink-muted">Proficiency</span>
              <TickTrack current={char.proficiency} max={6} variant="dot" className="text-oxblood" />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide text-ink">
              {ancestry && <Tag label={ancestry.name} variant="subtle" />}
              {community && <Tag label={community.name} variant="subtle" />}
              {transformation && <Tag label={transformation.name} variant="accent" />}
            </div>
          </div>
        </div>
        {char.description && (
          <p className="mt-4 border-t border-ink/15 pt-4 font-serif text-sm italic text-ink">
            {char.description}
          </p>
        )}
      </div>

      {/* HP, Stress, Hope, Evasion */}
      <div className="grid grid-cols-2 gap-4 border-y border-ink/15 py-4 md:grid-cols-4">
        <ResourceTracker
          label="HP"
          current={char.hp.current}
          max={char.hp.max}
          onAdjust={canEdit ? adjustHp : undefined}
          onAdjustMax={canEdit ? adjustMaxHp : undefined}
          color="text-oxblood"
          variant="dot"
        />
        <ResourceTracker
          label="Stress"
          current={char.stress.current}
          max={char.stress.max}
          onAdjust={canEdit ? adjustStress : undefined}
          onAdjustMax={canEdit ? adjustMaxStress : undefined}
          color="text-stress"
          variant="box"
        />
        <ResourceTracker
          label="Hope"
          current={char.hope}
          max={CHARACTER_HOPE_MAX}
          onAdjust={canEdit ? adjustHope : undefined}
          color="text-hope"
          variant="diamond"
        />
        <div className="text-center">
          <p className="font-sans text-sm font-semibold uppercase tracking-wide text-oxblood">Evasion</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            {canEdit && (
              <button type="button" onClick={() => adjustEvasion(-1)} className="text-ink-faint hover:text-ink">
                −
              </button>
            )}
            <p className="font-display text-3xl font-semibold text-ink">{char.evasion}</p>
            {canEdit && (
              <button type="button" onClick={() => adjustEvasion(1)} className="text-ink-faint hover:text-ink">
                +
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Equipment */}
      <SheetSection title="Equipment">
        <EquipmentPanel
          char={char}
          canEdit={canEdit}
          catalogOptions={catalogOptions}
          onAddCatalogItem={addCatalogItem}
          onEquipWeapon={handleEquipWeapon}
          onUnequipWeapon={handleUnequipWeapon}
          onEquipArmor={handleEquipArmor}
          onUnequipArmor={handleUnequipArmor}
          onRemoveInventoryItem={handleRemoveInventoryItem}
        />
      </SheetSection>

      {/* Armor & Wound Thresholds */}
      <SheetSection title="Armor & Wound Thresholds">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 font-sans text-sm text-ink">
              <span>Armor Score</span>
              {canEdit ? (
                <span className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustArmorScore(-1)}
                    className="text-ink-faint hover:text-ink"
                  >
                    −
                  </button>
                  <span className="font-semibold text-ink">{char.armorScore}</span>
                  <button
                    type="button"
                    onClick={() => adjustArmorScore(1)}
                    className="text-ink-faint hover:text-ink"
                  >
                    +
                  </button>
                </span>
              ) : (
                <span className="font-semibold text-ink">{char.armorScore}</span>
              )}
              {char.armorName && <span className="text-ink-muted"> · {char.armorName}</span>}
            </div>
            {char.armorSlots.max > 0 ? (
              <div>
                <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-ink-muted">Armor Slots</p>
                <div className="flex flex-wrap gap-1.5 text-oxblood">
                  {Array.from({ length: char.armorSlots.max }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => toggleArmorSlot(i)}
                      className={`tick tick-box ${
                        i < char.armorSlots.marked ? 'tick-filled' : ''
                      } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                      title={i < char.armorSlots.marked ? 'Marked — click to clear' : 'Available — click to mark'}
                    />
                  ))}
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {char.armorSlots.marked}/{char.armorSlots.max} marked
                </p>
              </div>
            ) : (
              <p className="font-serif text-sm text-ink-muted">Unarmored — no armor slots.</p>
            )}
          </div>
          <div>
            <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-ink-muted">Damage Thresholds</p>
            <div className="grid grid-cols-2 gap-3">
              <StatOverride
                label="Major"
                value={char.damageThresholds.major}
                onAdjust={canEdit ? (d) => adjustThreshold('major', d) : undefined}
                color="text-stress"
                hint="Mark 2 HP"
              />
              <StatOverride
                label="Severe"
                value={char.damageThresholds.severe}
                onAdjust={canEdit ? (d) => adjustThreshold('severe', d) : undefined}
                color="text-oxblood"
                hint="Mark 3 HP"
              />
            </div>
            <p className="mt-2 font-serif text-sm text-ink-muted">
              Below Major: mark 1 HP. Mark an armor slot to reduce severity by one step.
            </p>
          </div>
        </div>
      </SheetSection>

      {/* Traits */}
      <SheetSection title="Traits">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          {traits.map((t) => {
            const traitId = t.id as TraitId;
            const marked = char.markedTraits.includes(traitId);
            const val = char.traits[traitId];
            return (
              <div
                key={t.id}
                className={`relative border border-ink/20 bg-black/[0.03] p-3 pt-4 text-center ${
                  marked ? 'border-oxblood/50 bg-oxblood/8' : ''
                }`}
              >
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => toggleTraitMark(traitId)}
                    title={marked ? 'Unmark trait' : 'Mark trait'}
                    className={`absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center border text-[10px] ${
                      marked
                        ? 'border-oxblood bg-oxblood text-parchment'
                        : 'border-ink/30 text-transparent hover:border-ink/60 hover:text-ink-faint'
                    }`}
                  >
                    ✓
                  </button>
                ) : (
                  marked && (
                    <span
                      className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center border border-oxblood bg-oxblood text-[10px] text-parchment"
                      title="Marked"
                    >
                      ✓
                    </span>
                  )
                )}
                <p className="font-sans text-sm font-medium text-ink">{t.name}</p>
                {canEdit ? (
                  <div className="mt-1 flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustTrait(traitId, -1)}
                      className="text-ink-faint hover:text-ink"
                    >
                      −
                    </button>
                    <p className="font-display text-2xl font-semibold text-ink">
                      {val >= 0 ? '+' : ''}
                      {val}
                    </p>
                    <button
                      type="button"
                      onClick={() => adjustTrait(traitId, 1)}
                      className="text-ink-faint hover:text-ink"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <p className="font-display text-2xl font-semibold text-ink">
                    {val >= 0 ? '+' : ''}
                    {val}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {canEdit && (
          <p className="mt-2 text-sm text-ink-muted">
            Trait marks, trait scores, max HP/Stress, evasion, armor score, and thresholds require Save Changes.
          </p>
        )}
      </SheetSection>

      {/* Domain Cards Hand */}
      <SheetSection title="Domain Cards">
        <DomainCardHand
          cards={char.domainCards}
          onRemove={canEdit ? removeDomainCard : undefined}
        />
        {isDm && availableDomainCardsForDm.length > 0 && (
          <div className="mt-3 border-t border-ink/15 pt-3">
            <p className="mb-2 font-sans text-xs font-semibold tracking-wide text-ink-muted">Add domain card (DM)</p>
            <div className="flex flex-wrap gap-2">
              {availableDomainCardsForDm.map((c) => (
                <Button key={c.id} size="sm" variant="secondary" onClick={() => addDomainCard(c.id)}>
                  + {c.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </SheetSection>

      {/* Hope Feature */}
      {hopeFeature && (
        <SheetSection title="Hope Feature">
          <p className="font-serif text-sm text-ink">{hopeFeature}</p>
          {cls && (
            <div className="mt-2 flex flex-wrap gap-2">
              {cls.domains.map((d) => {
                const domain = domains.find((dom) => dom.id === d);
                return (
                  <span key={d} className="border border-ink/25 px-3 py-1 font-sans text-xs tracking-wide text-ink">
                    {domain?.name ?? d}
                  </span>
                );
              })}
            </div>
          )}
        </SheetSection>
      )}

      {getSubclassTracks(char).map((track) => (
        <SheetSection
          key={`${track.source}-${track.subclassId}`}
          title={track.source === 'multiclass' ? `Multiclass: ${track.name}` : `Subclass: ${track.name}`}
        >
          <SubclassStageList subclass={track.subclass} unlockedThrough={track.stage} />
        </SheetSection>
      ))}

      <SheetSection title="Class Abilities">
        <AbilityList abilities={char.abilities} />
      </SheetSection>

      <div className="grid gap-4 md:grid-cols-2">
        {ancestry && (
          <SheetSection title="Ancestry">
            <p className="mb-2 font-serif text-sm text-ink">{ancestry.description}</p>
            <ul className="space-y-1 font-serif text-sm">
              {ancestry.abilities.map((ab) => (
                <li key={ab} className="flex gap-1 text-ink">
                  <span className="text-oxblood">•</span>{ab}
                </li>
              ))}
            </ul>
          </SheetSection>
        )}
        {community && (
          <SheetSection title="Community">
            <p className="font-serif text-sm text-ink">{community.feature}</p>
          </SheetSection>
        )}
      </div>

      {transformation && (
        <SheetSection title="Transformation">
          <p className="mb-2 font-serif text-sm text-ink">{transformation.description}</p>
          <ul className="space-y-1 font-serif text-sm">
            {transformation.abilities.map((ab) => (
              <li key={ab.name} className="text-ink">
                <span className="text-oxblood">{ab.name}:</span> {ab.description}
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      {char.experienceEntries.some((e) => e.name.trim()) && (
        <SheetSection title="Experiences">
          <p className="mb-3 font-serif text-sm text-ink-muted">Spend Hope to add your Experience bonus to a related roll.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {char.experienceEntries.filter((e) => e.name.trim()).map((exp) => (
              <div key={exp.name} className="border-b border-ink/25 pb-2">
                <p className="font-serif italic text-ink">{exp.name}</p>
                <p className="mt-1 font-sans text-xs tracking-wide text-ink-muted">+{exp.bonus} modifier</p>
              </div>
            ))}
          </div>
        </SheetSection>
      )}

      {canEdit && (
        <>
          <Textarea
            label="Notes"
            value={char.notes ?? ''}
            onChange={(e) => updateLocal({ notes: e.target.value })}
          />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      )}
    </div>
  );
}

function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sheet-block">
      <h3 className="sheet-heading">{title}</h3>
      {children}
    </div>
  );
}

function AbilityList({ abilities, emptyText }: { abilities: Ability[]; emptyText?: string }) {
  if (abilities.length === 0) {
    return emptyText ? <p className="font-serif text-sm text-ink-faint">{emptyText}</p> : null;
  }
  return (
    <div className="space-y-2">
      {abilities.map((a, i) => (
        <div key={a.id ?? i} className="border-b border-ink/15 pb-2">
          <p className="font-display text-base font-semibold text-ink">{a.name}</p>
          <p className="font-serif text-sm leading-relaxed text-ink">{a.description}</p>
        </div>
      ))}
    </div>
  );
}

function LevelBadge({ level }: { level: number }) {
  return (
    <div className="inline-flex items-center border-2 border-oxblood px-3 py-0.5">
      <span className="font-display text-sm font-semibold tracking-widest text-oxblood">Level {level}</span>
    </div>
  );
}

function Tag({ label, variant = 'default' }: { label: string; variant?: 'default' | 'subtle' | 'accent' }) {
  const styles = {
    default: 'border-oxblood/50 text-oxblood',
    subtle: 'border-ink/30 text-ink',
    accent: 'border-hope/60 text-hope',
  };
  return (
    <span className={`border px-2.5 py-0.5 font-display text-xs tracking-wide ${styles[variant]}`}>
      {label}
    </span>
  );
}

function ResourceTracker({
  label,
  current,
  max,
  onAdjust,
  onAdjustMax,
  color,
  variant = 'dot',
}: {
  label: string;
  current: number;
  max: number;
  onAdjust?: (delta: number) => void;
  onAdjustMax?: (delta: number) => void;
  color: string;
  variant?: 'dot' | 'box' | 'diamond';
}) {
  return (
    <div className={`text-center ${color}`}>
      <p className="font-sans text-sm font-semibold uppercase tracking-wide">{label}</p>
      <TickTrack current={current} max={max} variant={variant} className="mt-2" />
      <div className="mt-1 flex items-center justify-center gap-2">
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(-1)} className="text-ink-faint hover:text-ink">
            −
          </button>
        )}
        <p className="font-display text-xl font-semibold">
          {current}/{max}
        </p>
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(1)} className="text-ink-faint hover:text-ink">
            +
          </button>
        )}
      </div>
      {onAdjustMax && (
        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
          <span>Max</span>
          <button type="button" onClick={() => onAdjustMax(-1)} className="hover:text-ink">
            −
          </button>
          <span className="font-medium text-ink-muted">{max}</span>
          <button type="button" onClick={() => onAdjustMax(1)} className="hover:text-ink">
            +
          </button>
        </div>
      )}
    </div>
  );
}

function StatOverride({
  label,
  value,
  onAdjust,
  color = 'text-ink',
  hint,
}: {
  label: string;
  value: number;
  onAdjust?: (delta: number) => void;
  color?: string;
  hint?: string;
}) {
  return (
    <div className="border border-ink/15 p-3 text-center">
      <p className={`font-sans text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</p>
      <div className="mt-1 flex items-center justify-center gap-2">
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(-1)} className="text-ink-faint hover:text-ink">
            −
          </button>
        )}
        <p className={`font-display text-2xl font-semibold ${color}`}>{value}</p>
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(1)} className="text-ink-faint hover:text-ink">
            +
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
