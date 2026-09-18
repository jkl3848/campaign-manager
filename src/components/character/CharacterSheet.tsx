import { useState, useEffect, useRef } from 'react';
import type { Character, InventoryItem, DomainCard, Ability, TraitId } from '../../types';
import { LevelUpWizard } from './LevelUpWizard';
import { canInitiateLevelUp, cancelLevelUp, initiateLevelUp } from '../../lib/levelUp';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { ImageUpload } from '../ui/ImageUpload';
import { DomainCardHand } from './DomainCardHand';
import { SubclassStageList } from './SubclassStageList';
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
import { formatWeaponDamage } from '../../lib/weaponDamage';
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
}: CharacterSheetProps) {
  const [char, setChar] = useState(() => normalizeCharacter(character));
  const [saving, setSaving] = useState(false);
  const [showLevelUpWizard, setShowLevelUpWizard] = useState(false);
  const [newItem, setNewItem] = useState('');
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charRef = useRef(char);
  const effectiveLayout = compact ? 'session' : layout;
  const isSession = effectiveLayout === 'session';

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

  const addInventoryItem = () => {
    if (!newItem.trim()) return;
    const item: InventoryItem = {
      id: crypto.randomUUID(),
      name: newItem.trim(),
      quantity: 1,
    };
    updateLive({ inventory: [...char.inventory, item] });
    setNewItem('');
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
        newItem={newItem}
        onNewItemChange={setNewItem}
        onAddInventoryItem={addInventoryItem}
        onTraitRoll={onTraitRoll}
      />
    );
  }

  return (
    <div className="space-y-5">
      {char.pendingLevelUp && (
        <div className="rounded-xl border border-amber-600/50 bg-amber-950/30 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-serif text-lg font-bold text-amber-200">
                Level Up Available!
              </p>
              <p className="text-sm text-slate-300">
                {isDm ? 'You initiated a level up to' : 'Your DM has granted a level up to'}{' '}
                <span className="font-bold text-amber-300">Level {char.pendingLevelUp.targetLevel}</span>.
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

      <div className="sheet-header p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="shrink-0">
            {onUploadImage && canEdit ? (
              <ImageUpload
                currentUrl={char.imageUrl}
                onUpload={async (file) => {
                  const url = await onUploadImage(file);
                  updateLocal({ imageUrl: url });
                }}
              />
            ) : char.imageUrl ? (
              <img
                src={char.imageUrl}
                alt={char.name}
                className="h-28 w-28 rounded-xl object-cover ring-2 ring-amber-700/50 shadow-lg"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-slate-800 ring-2 ring-amber-700/30">
                <span className="font-serif text-3xl text-amber-600/60">{char.name.charAt(0)}</span>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            {canEdit ? (
              <Input label="Name" value={char.name} onChange={(e) => updateLocal({ name: e.target.value })} />
            ) : (
              <h1 className="font-serif text-3xl font-bold text-amber-50">{char.name}</h1>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <LevelBadge level={char.level} />
              {isDm && canInitiateLevelUp(char) && (
                <Button size="sm" onClick={handleDmLevelUp} disabled={saving}>
                  Level Up
                </Button>
              )}
              {cls && <Tag label={cls.name} />}
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
              <span className="text-xs text-slate-500">Proficiency</span>
              <ProficiencyDots filled={char.proficiency} max={6} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {ancestry && <Tag label={ancestry.name} variant="subtle" />}
              {community && <Tag label={community.name} variant="subtle" />}
              {transformation && <Tag label={transformation.name} variant="accent" />}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {char.weaponName ?? 'Unarmed'}{' '}
              {char.weaponDamage && `(${formatWeaponDamage(char.weaponDamage)})`}
              {char.armorName && ` · ${char.armorName}`}
            </p>
          </div>
        </div>
        {char.description && (
          <p className="mt-4 border-t border-amber-900/20 pt-4 text-sm italic text-slate-300">
            {char.description}
          </p>
        )}
      </div>

      {/* HP, Stress, Hope, Evasion */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ResourceTracker
          label="HP"
          current={char.hp.current}
          max={char.hp.max}
          onAdjust={canEdit ? adjustHp : undefined}
          onAdjustMax={canEdit ? adjustMaxHp : undefined}
          color="text-red-400"
        />
        <ResourceTracker
          label="Stress"
          current={char.stress.current}
          max={char.stress.max}
          onAdjust={canEdit ? adjustStress : undefined}
          onAdjustMax={canEdit ? adjustMaxStress : undefined}
          color="text-yellow-400"
        />
        <ResourceTracker
          label="Hope"
          current={char.hope}
          max={CHARACTER_HOPE_MAX}
          onAdjust={canEdit ? adjustHope : undefined}
          color="text-sky-400"
        />
        <div className="sheet-section p-3 text-center">
          <p className="text-xs text-slate-400">Evasion</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            {canEdit && (
              <button type="button" onClick={() => adjustEvasion(-1)} className="text-slate-400 hover:text-slate-200">
                −
              </button>
            )}
            <p className="text-2xl font-bold text-slate-200">{char.evasion}</p>
            {canEdit && (
              <button type="button" onClick={() => adjustEvasion(1)} className="text-slate-400 hover:text-slate-200">
                +
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Armor & Wound Thresholds */}
      <SheetSection title="Armor & Wound Thresholds">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
              <span>Armor Score</span>
              {canEdit ? (
                <span className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustArmorScore(-1)}
                    className="text-slate-500 hover:text-slate-200"
                  >
                    −
                  </button>
                  <span className="font-bold text-amber-300">{char.armorScore}</span>
                  <button
                    type="button"
                    onClick={() => adjustArmorScore(1)}
                    className="text-slate-500 hover:text-slate-200"
                  >
                    +
                  </button>
                </span>
              ) : (
                <span className="font-bold text-amber-300">{char.armorScore}</span>
              )}
              {char.armorName && <span className="text-slate-500"> · {char.armorName}</span>}
            </div>
            {char.armorSlots.max > 0 ? (
              <div>
                <p className="mb-2 text-xs text-slate-400">Armor Slots</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: char.armorSlots.max }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => toggleArmorSlot(i)}
                      className={`h-10 w-10 rounded-lg border-2 transition-all ${
                        i < char.armorSlots.marked
                          ? 'border-amber-500 bg-amber-900/50 text-amber-300'
                          : 'border-slate-600 bg-slate-800/60 text-slate-500 hover:border-slate-400'
                      } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                      title={i < char.armorSlots.marked ? 'Marked — click to clear' : 'Available — click to mark'}
                    >
                      🛡
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {char.armorSlots.marked}/{char.armorSlots.max} marked
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Unarmored — no armor slots.</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs text-slate-400">Damage Thresholds</p>
            <div className="grid grid-cols-2 gap-3">
              <StatOverride
                label="Major"
                value={char.damageThresholds.major}
                onAdjust={canEdit ? (d) => adjustThreshold('major', d) : undefined}
                color="text-yellow-400"
                hint="Mark 2 HP"
              />
              <StatOverride
                label="Severe"
                value={char.damageThresholds.severe}
                onAdjust={canEdit ? (d) => adjustThreshold('severe', d) : undefined}
                color="text-red-400"
                hint="Mark 3 HP"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
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
                className={`relative rounded-lg bg-slate-900/60 p-3 pt-4 text-center ${
                  marked ? 'ring-2 ring-amber-600/50' : ''
                }`}
              >
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => toggleTraitMark(traitId)}
                    title={marked ? 'Unmark trait' : 'Mark trait'}
                    className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded border text-[11px] transition-colors ${
                      marked
                        ? 'border-amber-500 bg-amber-900/60 text-amber-300'
                        : 'border-slate-600 bg-slate-800/80 text-transparent hover:border-slate-400 hover:text-slate-500'
                    }`}
                  >
                    ✓
                  </button>
                ) : (
                  marked && (
                    <span
                      className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded border border-amber-500 bg-amber-900/60 text-[11px] text-amber-300"
                      title="Marked"
                    >
                      ✓
                    </span>
                  )
                )}
                <p className="text-sm text-slate-300">{t.name}</p>
                {canEdit ? (
                  <div className="mt-1 flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustTrait(traitId, -1)}
                      className="text-slate-500 hover:text-slate-200"
                    >
                      −
                    </button>
                    <p className="text-xl font-bold text-amber-400">
                      {val >= 0 ? '+' : ''}
                      {val}
                    </p>
                    <button
                      type="button"
                      onClick={() => adjustTrait(traitId, 1)}
                      className="text-slate-500 hover:text-slate-200"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <p className="text-xl font-bold text-amber-400">
                    {val >= 0 ? '+' : ''}
                    {val}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {canEdit && (
          <p className="mt-2 text-xs text-slate-500">
            Trait marks, trait scores, max HP/Stress, evasion, armor score, and thresholds require Save Changes.
          </p>
        )}
      </SheetSection>

      {/* Domain Cards Hand */}
      <SheetSection title="Domain Cards">
        <DomainCardHand cards={char.domainCards} />
        {isDm && availableDomainCardsForDm.length > 0 && (
          <div className="mt-3 border-t border-slate-700/40 pt-3">
            <p className="mb-2 text-xs text-slate-400">Add domain card (DM)</p>
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
          <p className="text-sm text-slate-200">{hopeFeature}</p>
          {cls && (
            <div className="mt-2 flex flex-wrap gap-2">
              {cls.domains.map((d) => {
                const domain = domains.find((dom) => dom.id === d);
                return (
                  <span key={d} className="rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1 text-xs text-slate-300">
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
            <p className="mb-2 text-sm text-slate-300">{ancestry.description}</p>
            <ul className="space-y-1 text-sm">
              {ancestry.abilities.map((ab) => (
                <li key={ab} className="flex gap-1 text-slate-400">
                  <span className="text-amber-500">•</span>{ab}
                </li>
              ))}
            </ul>
          </SheetSection>
        )}
        {community && (
          <SheetSection title="Community">
            <p className="text-sm text-slate-300">{community.feature}</p>
          </SheetSection>
        )}
      </div>

      {transformation && (
        <SheetSection title="Transformation">
          <p className="mb-2 text-sm text-slate-300">{transformation.description}</p>
          <ul className="space-y-1 text-sm">
            {transformation.abilities.map((ab) => (
              <li key={ab.name} className="text-slate-400">
                <span className="text-amber-400">{ab.name}:</span> {ab.description}
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      {char.experienceEntries.some((e) => e.name.trim()) && (
        <SheetSection title="Experiences">
          <p className="mb-3 text-xs text-slate-500">Spend Hope to add your Experience bonus to a related roll.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {char.experienceEntries.filter((e) => e.name.trim()).map((exp) => (
              <div key={exp.name} className="rounded-lg bg-slate-900/60 p-3">
                <p className="font-medium text-amber-200">{exp.name}</p>
                <p className="mt-1 text-xs text-slate-400">+{exp.bonus} modifier</p>
              </div>
            ))}
          </div>
        </SheetSection>
      )}

      <Card title="Inventory">
        <div className="space-y-2">
          {char.inventory.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded bg-slate-900/50 px-3 py-2">
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
    <div className="sheet-section p-4">
      <h3 className="mb-3 font-serif text-lg font-semibold text-amber-200">{title}</h3>
      {children}
    </div>
  );
}

function AbilityList({ abilities, emptyText }: { abilities: Ability[]; emptyText?: string }) {
  if (abilities.length === 0) {
    return emptyText ? <p className="text-sm text-slate-500">{emptyText}</p> : null;
  }
  return (
    <div className="space-y-2">
      {abilities.map((a, i) => (
        <div key={a.id ?? i} className="rounded-lg bg-slate-900/60 p-3">
          <p className="font-medium text-slate-200">{a.name}</p>
          <p className="text-sm text-slate-400">{a.description}</p>
        </div>
      ))}
    </div>
  );
}

function LevelBadge({ level }: { level: number }) {
  return (
    <div className="inline-flex items-center rounded-full border border-amber-700/50 bg-amber-950/40 px-3 py-1">
      <span className="font-serif text-sm font-bold text-amber-300">Level {level}</span>
    </div>
  );
}

function ProficiencyDots({ filled, max }: { filled: number; max: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-full border ${
            i < filled
              ? 'border-amber-500 bg-amber-500'
              : 'border-slate-600 bg-transparent'
          }`}
        />
      ))}
    </div>
  );
}

function Tag({ label, variant = 'default' }: { label: string; variant?: 'default' | 'subtle' | 'accent' }) {
  const styles = {
    default: 'border-amber-700/40 bg-amber-950/30 text-amber-200',
    subtle: 'border-slate-600 bg-slate-800/60 text-slate-300',
    accent: 'border-purple-700/40 bg-purple-950/30 text-purple-200',
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs ${styles[variant]}`}>
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
}: {
  label: string;
  current: number;
  max: number;
  onAdjust?: (delta: number) => void;
  onAdjustMax?: (delta: number) => void;
  color: string;
}) {
  return (
    <div className="sheet-section p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <div className="mt-1 flex items-center justify-center gap-2">
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(-1)} className="text-slate-400 hover:text-slate-200">
            −
          </button>
        )}
        <p className={`text-2xl font-bold ${color}`}>
          {current}/{max}
        </p>
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(1)} className="text-slate-400 hover:text-slate-200">
            +
          </button>
        )}
      </div>
      {onAdjustMax && (
        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <span>Max</span>
          <button type="button" onClick={() => onAdjustMax(-1)} className="hover:text-slate-200">
            −
          </button>
          <span className="font-medium text-slate-300">{max}</span>
          <button type="button" onClick={() => onAdjustMax(1)} className="hover:text-slate-200">
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
  color = 'text-slate-200',
  hint,
}: {
  label: string;
  value: number;
  onAdjust?: (delta: number) => void;
  color?: string;
  hint?: string;
}) {
  const labelColor =
    color.includes('yellow') || color.includes('red') ? color : 'text-slate-400';
  return (
    <div className="rounded-lg bg-slate-900/60 p-3 text-center">
      <p className={`text-xs ${labelColor}`}>{label}</p>
      <div className="mt-1 flex items-center justify-center gap-2">
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(-1)} className="text-slate-400 hover:text-slate-200">
            −
          </button>
        )}
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(1)} className="text-slate-400 hover:text-slate-200">
            +
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}
