import { useState } from 'react';
import type { Character, Ability, DomainCard } from '../../types';
import { LevelUpWizard } from './LevelUpWizard';
import { canInitiateLevelUp } from '../../lib/levelUp';
import { stageLabel } from '../../lib/subclasses';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';
import traits from '../../config/daggerheart/traits.json';
import domains from '../../config/daggerheart/domains.json';
import { formatWeaponDamage } from '../../lib/weaponDamage';
import { CHARACTER_HOPE_MAX } from '../../lib/hopeFear';

interface CharacterSheetSessionProps {
  char: Character;
  canEdit: boolean;
  isDm: boolean;
  saving: boolean;
  cls?: { id: string; name: string; domains: string[]; hopeFeature?: string };
  ancestry?: { name: string; description: string; abilities: string[] };
  community?: { name: string; feature: string };
  transformation?: { name: string; description: string; abilities: { name: string; description: string }[] };
  subclass?: { name: string };
  hopeFeature?: string;
  availableDomainCardsForDm: { id: string; name: string }[];
  onAdjustHp: (delta: number) => void;
  onAdjustStress: (delta: number) => void;
  onAdjustHope: (delta: number) => void;
  onToggleArmorSlot: (index: number) => void;
  onUpdateNotes: (notes: string) => void;
  onDmLevelUp: () => void;
  onCancelLevelUp: () => void;
  onLevelUpComplete: (character: Character) => Promise<void>;
  onAddDomainCard: (cardId: string) => void;
  newItem: string;
  onNewItemChange: (value: string) => void;
  onAddInventoryItem: () => void;
  onTraitRoll?: (traitName: string, modifier: number) => void;
}

export function CharacterSheetSession({
  char,
  canEdit,
  isDm,
  saving,
  cls,
  ancestry,
  community,
  transformation,
  subclass,
  hopeFeature,
  availableDomainCardsForDm,
  onAdjustHp,
  onAdjustStress,
  onAdjustHope,
  onToggleArmorSlot,
  onUpdateNotes,
  onDmLevelUp,
  onCancelLevelUp,
  onLevelUpComplete,
  onAddDomainCard,
  newItem,
  onNewItemChange,
  onAddInventoryItem,
  onTraitRoll,
}: CharacterSheetSessionProps) {
  const [showLevelUpWizard, setShowLevelUpWizard] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  return (
    <div className="space-y-3 text-sm">
      {char.pendingLevelUp && (
        <div className="rounded-lg border border-amber-600/40 bg-amber-950/30 p-3">
          <p className="font-serif text-xs font-bold text-amber-200">Level Up Available!</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Advance to Level {char.pendingLevelUp.targetLevel}
          </p>
          <div className="mt-2 flex gap-2">
            {canEdit && (
              <Button size="sm" className="flex-1" onClick={() => setShowLevelUpWizard(true)}>
                Complete
              </Button>
            )}
            {isDm && (
              <Button size="sm" variant="ghost" onClick={onCancelLevelUp} disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {showLevelUpWizard && char.pendingLevelUp && (
        <LevelUpWizard
          character={char}
          onComplete={async (c) => {
            await onLevelUpComplete(c);
            setShowLevelUpWizard(false);
          }}
          onCancel={() => setShowLevelUpWizard(false)}
        />
      )}

      {/* Identity */}
      <div className="flex items-start gap-2.5">
        {char.imageUrl ? (
          <img src={char.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-amber-800/40" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-lg font-serif text-amber-600/60">
            {char.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif font-bold text-amber-50">{char.name}</p>
          <p className="text-[11px] text-amber-400/80">
            Lv {char.level} {cls?.name}
            {subclass && ` · ${subclass.name} (${stageLabel(char.subclassStage)})`}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {ancestry && <Chip label={ancestry.name} />}
            {community && <Chip label={community.name} />}
            {transformation && <Chip label={transformation.name} accent />}
          </div>
        </div>
        {isDm && canInitiateLevelUp(char) && (
          <Button size="sm" onClick={onDmLevelUp} disabled={saving}>
            Lv↑
          </Button>
        )}
      </div>

      {/* Weapon */}
      <p className="text-[11px] text-slate-500">
        {char.weaponName ?? 'Unarmed'}
        {char.weaponDamage && ` (${formatWeaponDamage(char.weaponDamage)})`}
        {char.armorName && ` · ${char.armorName}`}
      </p>

      {/* Core resources — 2×2 grid */}
      <div className="grid grid-cols-2 gap-1.5">
        <SessionResource label="HP" current={char.hp.current} max={char.hp.max} color="text-red-400" onAdjust={canEdit ? onAdjustHp : undefined} />
        <SessionResource label="Stress" current={char.stress.current} max={char.stress.max} color="text-yellow-400" onAdjust={canEdit ? onAdjustStress : undefined} />
        <SessionResource label="Hope" current={char.hope} max={CHARACTER_HOPE_MAX} color="text-sky-400" onAdjust={canEdit ? onAdjustHope : undefined} />
        <div className="rounded-md bg-slate-900/60 px-2 py-1.5 text-center">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Evasion</p>
          <p className="text-lg font-bold text-slate-200">{char.evasion}</p>
        </div>
      </div>

      {/* Proficiency */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">Proficiency</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i < char.proficiency ? 'bg-amber-500' : 'bg-slate-700'}`}
            />
          ))}
        </div>
      </div>

      <SessionSection title="Armor & Thresholds" defaultOpen>
        <p className="mb-2 text-[11px] text-slate-400">
          Score <span className="font-bold text-amber-300">{char.armorScore}</span>
          {char.armorName && <span className="text-slate-500"> · {char.armorName}</span>}
        </p>
        {char.armorSlots.max > 0 && (
          <div className="mb-2">
            <p className="mb-1 text-[10px] text-slate-500">Armor slots ({char.armorSlots.marked}/{char.armorSlots.max})</p>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: char.armorSlots.max }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => onToggleArmorSlot(i)}
                  className={`h-7 w-7 rounded border text-xs transition-all ${
                    i < char.armorSlots.marked
                      ? 'border-amber-500 bg-amber-900/50 text-amber-300'
                      : 'border-slate-600 bg-slate-800/60 text-slate-500'
                  } ${canEdit ? 'cursor-pointer hover:border-slate-400' : 'cursor-default'}`}
                >
                  🛡
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-md bg-slate-900/60 p-2 text-center">
            <p className="text-[10px] text-yellow-400">Major</p>
            <p className="text-lg font-bold text-slate-200">{char.damageThresholds.major}</p>
          </div>
          <div className="rounded-md bg-slate-900/60 p-2 text-center">
            <p className="text-[10px] text-red-400">Severe</p>
            <p className="text-lg font-bold text-slate-200">{char.damageThresholds.severe}</p>
          </div>
        </div>
      </SessionSection>

      <SessionSection title="Traits" defaultOpen>
        <div className="grid grid-cols-2 gap-1">
          {traits.map((t) => {
            const traitId = t.id as keyof typeof char.traits;
            const marked = char.markedTraits.includes(traitId);
            const val = char.traits[traitId];
            const clickable = !!onTraitRoll;
            const Tag = clickable ? 'button' : 'div';
            return (
              <Tag
                key={t.id}
                type={clickable ? 'button' : undefined}
                onClick={clickable ? () => onTraitRoll(t.name, val) : undefined}
                title={clickable ? `Roll ${t.name}` : undefined}
                className={`relative flex w-full items-center justify-between rounded-md bg-slate-900/60 px-2 py-1.5 pr-6 ${
                  marked ? 'ring-1 ring-amber-600/40' : ''
                } ${
                  clickable
                    ? 'cursor-pointer transition-colors hover:bg-slate-800/80 hover:ring-1 hover:ring-amber-600/30'
                    : ''
                }`}
              >
                <span className="truncate text-[11px] text-slate-400">{t.name}</span>
                <span className="text-sm font-bold text-amber-400">
                  {val >= 0 ? '+' : ''}
                  {val}
                </span>
                {marked && (
                  <span
                    className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded border border-amber-500/80 bg-amber-900/50 text-[8px] text-amber-300"
                    title="Marked"
                  >
                    ✓
                  </span>
                )}
              </Tag>
            );
          })}
        </div>
      </SessionSection>

      {char.domainCards.length > 0 && (
        <SessionSection title={`Domain Cards (${char.domainCards.length})`}>
          <div className="space-y-1">
            {char.domainCards.map((card) => (
              <DomainCardRow
                key={card.id}
                card={card}
                expanded={expandedCardId === card.id}
                onToggle={() => setExpandedCardId(expandedCardId === card.id ? null : card.id)}
              />
            ))}
          </div>
          {isDm && availableDomainCardsForDm.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-slate-700/40 pt-2">
              <p className="text-[10px] text-slate-500">Add card (DM)</p>
              {availableDomainCardsForDm.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onAddDomainCard(c.id)}
                  className="block w-full truncate rounded bg-slate-800/60 px-2 py-1 text-left text-[11px] text-slate-300 hover:bg-slate-700/60"
                >
                  + {c.name}
                </button>
              ))}
            </div>
          )}
        </SessionSection>
      )}

      {hopeFeature && (
        <SessionSection title="Hope Feature">
          <p className="text-[11px] leading-relaxed text-slate-300">{hopeFeature}</p>
          {cls && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {cls.domains.map((d) => {
                const domain = domains.find((dom) => dom.id === d);
                return <Chip key={d} label={domain?.name ?? d} />;
              })}
            </div>
          )}
        </SessionSection>
      )}

      {char.abilities.length > 0 && (
        <SessionSection title="Abilities">
          <AbilityList abilities={char.abilities} compact />
        </SessionSection>
      )}

      {(ancestry || community) && (
        <SessionSection title="Background">
          {ancestry && (
            <div className="mb-2">
              <p className="text-[11px] font-medium text-amber-200/80">{ancestry.name}</p>
              <ul className="mt-0.5 space-y-0.5">
                {ancestry.abilities.map((ab) => (
                  <li key={ab} className="text-[11px] text-slate-400">· {ab}</li>
                ))}
              </ul>
            </div>
          )}
          {community && (
            <div>
              <p className="text-[11px] font-medium text-amber-200/80">{community.name}</p>
              <p className="text-[11px] text-slate-400">{community.feature}</p>
            </div>
          )}
        </SessionSection>
      )}

      {transformation && (
        <SessionSection title="Transformation">
          <p className="text-[11px] text-slate-400">{transformation.description}</p>
          <ul className="mt-1 space-y-0.5">
            {transformation.abilities.map((ab) => (
              <li key={ab.name} className="text-[11px] text-slate-400">
                <span className="text-amber-400/80">{ab.name}:</span> {ab.description}
              </li>
            ))}
          </ul>
        </SessionSection>
      )}

      {char.experienceEntries.some((e) => e.name.trim()) && (
        <SessionSection title="Experiences">
          <div className="space-y-1">
            {char.experienceEntries.filter((e) => e.name.trim()).map((exp) => (
              <div key={exp.name} className="flex items-center justify-between rounded-md bg-slate-900/60 px-2 py-1">
                <span className="truncate text-[11px] text-amber-200/80">{exp.name}</span>
                <span className="text-[11px] text-slate-500">+{exp.bonus}</span>
              </div>
            ))}
          </div>
        </SessionSection>
      )}

      {(char.inventory.length > 0 || canEdit) && (
        <SessionSection title="Inventory">
          <div className="space-y-1">
            {char.inventory.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md bg-slate-900/60 px-2 py-1">
                <span className="truncate text-[11px] text-slate-300">{item.name}</span>
                <span className="text-[11px] text-slate-500">×{item.quantity}</span>
              </div>
            ))}
            {canEdit && (
              <div className="flex gap-1 pt-1">
                <Input
                  value={newItem}
                  onChange={(e) => onNewItemChange(e.target.value)}
                  placeholder="Add item..."
                  onKeyDown={(e) => e.key === 'Enter' && onAddInventoryItem()}
                />
                <Button size="sm" onClick={onAddInventoryItem}>+</Button>
              </div>
            )}
          </div>
        </SessionSection>
      )}

      {canEdit && (
        <div className="space-y-2 border-t border-slate-700/40 pt-3">
          <Textarea
            label="Notes"
            value={char.notes ?? ''}
            onChange={(e) => onUpdateNotes(e.target.value)}
            className="min-h-16 text-xs"
          />
          {saving && (
            <p className="text-center text-[10px] text-slate-500">Saving…</p>
          )}
        </div>
      )}
    </div>
  );
}

function SessionSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-slate-700/40 bg-slate-900/40">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-2.5 py-2 text-left"
      >
        <span className="font-serif text-xs font-semibold text-amber-200/90">{title}</span>
        <span className="text-[10px] text-slate-500">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="border-t border-slate-700/30 px-2.5 pb-2.5">{children}</div>}
    </div>
  );
}

function SessionResource({
  label,
  current,
  max,
  color,
  onAdjust,
}: {
  label: string;
  current: number;
  max: number;
  color: string;
  onAdjust?: (delta: number) => void;
}) {
  return (
    <div className="rounded-md bg-slate-900/60 px-2 py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex items-center justify-center gap-1">
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(-1)} className="text-slate-500 hover:text-slate-200 text-xs px-0.5">−</button>
        )}
        <span className={`text-lg font-bold ${color}`}>{current}/{max}</span>
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(1)} className="text-slate-500 hover:text-slate-200 text-xs px-0.5">+</button>
        )}
      </div>
    </div>
  );
}

function DomainCardRow({
  card,
  expanded,
  onToggle,
}: {
  card: DomainCard;
  expanded: boolean;
  onToggle: () => void;
}) {
  const domain = domains.find((d) => d.id === card.domainId);
  return (
    <div className="rounded-md bg-slate-900/60">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-2 py-1.5 text-left">
        <span className="truncate text-[11px] font-medium text-amber-100/90">{card.name}</span>
        <span className="ml-1 shrink-0 text-[10px] text-slate-500">L{card.level}</span>
      </button>
      {expanded && (
        <div className="border-t border-slate-700/30 px-2 py-1.5">
          <p className="text-[10px] text-slate-500">{domain?.name ?? card.domainId} · {card.type ?? 'ability'}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{card.description}</p>
          {card.recallCost != null && (
            <p className="mt-0.5 text-[10px] text-slate-600">Recall: {card.recallCost} Stress</p>
          )}
        </div>
      )}
    </div>
  );
}

function AbilityList({ abilities, compact }: { abilities: Ability[]; compact?: boolean }) {
  return (
    <div className="space-y-1">
      {abilities.map((a, i) => (
        <div key={a.id ?? i} className="rounded-md bg-slate-900/60 px-2 py-1.5">
          <p className="text-[11px] font-medium text-slate-200">{a.name}</p>
          {!compact && <p className="text-[11px] text-slate-400">{a.description}</p>}
          {compact && <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500 line-clamp-2">{a.description}</p>}
        </div>
      ))}
    </div>
  );
}

function Chip({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
        accent
          ? 'bg-purple-950/40 text-purple-300'
          : 'bg-slate-800/80 text-slate-400'
      }`}
    >
      {label}
    </span>
  );
}
