import { useState } from 'react';
import type { Character, InventoryItem, Ability, DomainCard } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { ImageUpload } from '../ui/ImageUpload';
import { DomainCardHand } from './DomainCardHand';
import traits from '../../config/daggerheart/traits.json';
import classes from '../../config/daggerheart/classes.json';
import ancestries from '../../config/daggerheart/ancestries.json';
import communities from '../../config/daggerheart/communities.json';
import transformations from '../../config/daggerheart/transformations.json';
import domains from '../../config/daggerheart/domains.json';
import domainCardsCatalog from '../../config/daggerheart/domain-cards.json';
import { normalizeCharacter } from '../../lib/characterNormalize';
import { computeArmorStats } from '../../lib/characterArmor';

interface CharacterSheetProps {
  character: Character;
  onSave: (character: Character) => Promise<void>;
  onUploadImage?: (file: File) => Promise<string>;
  canEdit?: boolean;
  isDm?: boolean;
  compact?: boolean;
}

export function CharacterSheet({
  character,
  onSave,
  onUploadImage,
  canEdit = true,
  isDm = false,
  compact = false,
}: CharacterSheetProps) {
  const [char, setChar] = useState(() => normalizeCharacter(character));
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [newFeat, setNewFeat] = useState({ name: '', description: '' });

  const cls = classes.find((c) => c.id === char.classId);
  const ancestry = ancestries.find((a) => a.id === char.ancestryId);
  const community = communities.find((c) => c.id === char.communityId);
  const transformation = transformations.find((t) => t.id === char.transformationId);
  const subclass = cls?.subclasses.find((s) => s.id === char.subclassId);
  const hopeFeature = char.hopeFeature ?? cls?.hopeFeature;

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

  const adjustLevel = (delta: number) => {
    const newLevel = Math.max(1, Math.min(10, char.level + delta));
    const armorStats = computeArmorStats(char.armorId ?? 'none', newLevel);
    update({
      level: newLevel,
      damageThresholds: armorStats.damageThresholds,
      armorSlots: { ...char.armorSlots, max: armorStats.armorSlots.max },
      armorScore: armorStats.armorScore,
    });
  };

  const toggleArmorSlot = (index: number) => {
    const marked = char.armorSlots.marked;
    const max = char.armorSlots.max;
    if (index < marked) {
      update({ armorSlots: { marked: marked - 1, max } });
    } else if (index === marked && marked < max) {
      update({ armorSlots: { marked: marked + 1, max } });
    }
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

  const addFeat = () => {
    if (!newFeat.name.trim()) return;
    const feat: Ability = { id: crypto.randomUUID(), ...newFeat };
    update({ feats: [...char.feats, feat] });
    setNewFeat({ name: '', description: '' });
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
    update({ domainCards: [...char.domainCards, card] });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ ...char, updatedAt: Date.now() });
    setSaving(false);
  };

  const availableDomainCardsForDm = cls
    ? domainCardsCatalog.filter(
        (c) => cls.domains.includes(c.domain) && c.level <= char.level && !char.domainCards.some((dc) => dc.id === c.id),
      )
    : [];

  if (compact) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          {char.imageUrl && (
            <img src={char.imageUrl} alt={char.name} className="h-12 w-12 rounded-lg object-cover ring-2 ring-amber-900/50" />
          )}
          <div>
            <p className="font-bold text-slate-100">{char.name}</p>
            <p className="text-xs text-amber-400">Level {char.level} {cls?.name}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatBadge label="HP" value={`${char.hp.current}/${char.hp.max}`} color="red" />
          <StatBadge label="Stress" value={`${char.stress.current}/${char.stress.max}`} color="yellow" />
          <StatBadge label="Hope" value={String(char.hope)} color="sky" />
        </div>
        <div className="flex flex-wrap gap-1">
          {traits.map((t) => (
            <span key={t.id} className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
              {t.name}: {char.traits[t.id as keyof typeof char.traits] >= 0 ? '+' : ''}
              {char.traits[t.id as keyof typeof char.traits]}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="sheet-header p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="shrink-0">
            {onUploadImage && canEdit ? (
              <ImageUpload
                currentUrl={char.imageUrl}
                onUpload={async (file) => {
                  const url = await onUploadImage(file);
                  update({ imageUrl: url });
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
              <Input label="Name" value={char.name} onChange={(e) => update({ name: e.target.value })} />
            ) : (
              <h1 className="font-serif text-3xl font-bold text-amber-50">{char.name}</h1>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <LevelBadge level={char.level} onAdjust={isDm ? adjustLevel : undefined} />
              {cls && <Tag label={cls.name} />}
              {subclass && <Tag label={subclass.name} variant="subtle" />}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {ancestry && <Tag label={ancestry.name} variant="subtle" />}
              {community && <Tag label={community.name} variant="subtle" />}
              {transformation && <Tag label={transformation.name} variant="accent" />}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {char.weaponName ?? 'Unarmed'} {char.weaponDamage && `(${char.weaponDamage})`}
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
        <ResourceTracker label="HP" current={char.hp.current} max={char.hp.max} onAdjust={canEdit ? adjustHp : undefined} color="text-red-400" />
        <ResourceTracker label="Stress" current={char.stress.current} max={char.stress.max} onAdjust={canEdit ? adjustStress : undefined} color="text-yellow-400" />
        <ResourceTracker label="Hope" current={char.hope} max={6} onAdjust={canEdit ? adjustHope : undefined} color="text-sky-400" />
        <div className="sheet-section p-3 text-center">
          <p className="text-xs text-slate-400">Evasion</p>
          <p className="text-2xl font-bold text-slate-200">{char.evasion}</p>
        </div>
      </div>

      {/* Armor & Wound Thresholds */}
      <SheetSection title="Armor & Wound Thresholds">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-slate-400">
              Armor Score: <span className="font-bold text-amber-300">{char.armorScore}</span>
              {char.armorName && <span className="text-slate-500"> · {char.armorName}</span>}
            </p>
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
              <div className="rounded-lg bg-slate-900/60 p-3 text-center">
                <p className="text-xs text-yellow-400">Major</p>
                <p className="text-2xl font-bold text-slate-200">{char.damageThresholds.major}</p>
                <p className="text-[10px] text-slate-500">Mark 2 HP</p>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-3 text-center">
                <p className="text-xs text-red-400">Severe</p>
                <p className="text-2xl font-bold text-slate-200">{char.damageThresholds.severe}</p>
                <p className="text-[10px] text-slate-500">Mark 3 HP</p>
              </div>
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
          {traits.map((t) => (
            <div key={t.id} className="rounded-lg bg-slate-900/60 p-3 text-center">
              <p className="text-sm text-slate-300">{t.name}</p>
              <p className="text-xl font-bold text-amber-400">
                {char.traits[t.id as keyof typeof char.traits] >= 0 ? '+' : ''}
                {char.traits[t.id as keyof typeof char.traits]}
              </p>
            </div>
          ))}
        </div>
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

      <SheetSection title="Class Abilities">
        <AbilityList abilities={char.abilities} />
      </SheetSection>

      <SheetSection title="Feats">
        <AbilityList abilities={char.feats} emptyText="No feats yet." />
        {isDm && (
          <AddAbilityForm
            value={newFeat}
            onChange={setNewFeat}
            onAdd={addFeat}
            placeholder="Feat name"
          />
        )}
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

      {char.experiences.some((e) => e.trim()) && (
        <SheetSection title="Experiences">
          <p className="mb-3 text-xs text-slate-500">Spend Hope to add +2 to a related roll.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {char.experiences.filter((e) => e.trim()).map((exp) => (
              <div key={exp} className="rounded-lg bg-slate-900/60 p-3">
                <p className="font-medium text-amber-200">{exp}</p>
                <p className="mt-1 text-xs text-slate-400">+2 modifier</p>
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

function AddAbilityForm({
  value,
  onChange,
  onAdd,
  placeholder,
}: {
  value: { name: string; description: string };
  onChange: (v: { name: string; description: string }) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  return (
    <div className="mt-3 space-y-2 border-t border-slate-700/40 pt-3">
      <Input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        placeholder={placeholder}
      />
      <Input
        value={value.description}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        placeholder="Description"
      />
      <Button size="sm" variant="secondary" onClick={onAdd}>Add</Button>
    </div>
  );
}

function LevelBadge({ level, onAdjust }: { level: number; onAdjust?: (delta: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-amber-700/50 bg-amber-950/40 px-3 py-1">
      {onAdjust && (
        <button type="button" onClick={() => onAdjust(-1)} className="text-amber-400 hover:text-amber-200">−</button>
      )}
      <span className="font-serif text-sm font-bold text-amber-300">Level {level}</span>
      {onAdjust && (
        <button type="button" onClick={() => onAdjust(1)} className="text-amber-400 hover:text-amber-200">+</button>
      )}
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
  color,
}: {
  label: string;
  current: number;
  max: number;
  onAdjust?: (delta: number) => void;
  color: string;
}) {
  return (
    <div className="sheet-section p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <div className="mt-1 flex items-center justify-center gap-2">
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(-1)} className="text-slate-400 hover:text-slate-200">−</button>
        )}
        <p className={`text-2xl font-bold ${color}`}>{current}/{max}</p>
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(1)} className="text-slate-400 hover:text-slate-200">+</button>
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
    <div className="rounded bg-slate-900/50 p-2 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
}
