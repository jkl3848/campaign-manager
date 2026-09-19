import { useState } from 'react';
import type { Character, Ability, DomainCard } from '../../types';
import { LevelUpWizard } from './LevelUpWizard';
import { canInitiateLevelUp } from '../../lib/levelUp';
import { stageLabel } from '../../lib/subclasses';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';
import { TickTrack } from '../ui/TickTrack';
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
    <div className="paper-sheet-compact space-y-3 p-3 text-sm">
      {char.pendingLevelUp && (
        <div className="border border-oxblood/40 bg-oxblood/8 p-3">
          <p className="font-display text-xs font-semibold tracking-wide text-oxblood">Level Up Available</p>
          <p className="mt-1 text-[11px] text-ink-muted">
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
          <div className="h-12 w-10 shrink-0 rotate-[-1deg] bg-parchment p-0.5 shadow-sm">
            <img src={char.imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-12 w-10 shrink-0 rotate-[-1deg] items-center justify-center border border-ink/20 font-display text-lg text-oxblood/50">
            {char.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold text-ink">{char.name}</p>
          <p className="text-[11px] text-oxblood">
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
      <p className="text-[11px] text-ink-faint">
        {char.weaponName ?? 'Unarmed'}
        {char.weaponDamage && ` (${formatWeaponDamage(char.weaponDamage)})`}
        {char.armorName && ` · ${char.armorName}`}
      </p>

      <div className="grid grid-cols-2 gap-2 border-y border-ink/15 py-2">
        <SessionResource label="HP" current={char.hp.current} max={char.hp.max} color="text-oxblood" variant="dot" onAdjust={canEdit ? onAdjustHp : undefined} />
        <SessionResource label="Stress" current={char.stress.current} max={char.stress.max} color="text-stress" variant="box" onAdjust={canEdit ? onAdjustStress : undefined} />
        <SessionResource label="Hope" current={char.hope} max={CHARACTER_HOPE_MAX} color="text-hope" variant="diamond" onAdjust={canEdit ? onAdjustHope : undefined} />
        <div className="px-2 py-1.5 text-center">
          <p className="font-display text-[10px] uppercase tracking-[0.16em] text-ink-faint">Evasion</p>
          <p className="font-display text-lg font-semibold text-ink">{char.evasion}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-display text-[10px] uppercase tracking-[0.16em] text-ink-faint">Proficiency</span>
        <TickTrack current={char.proficiency} max={6} variant="dot" className="text-oxblood" />
      </div>

      <SessionSection title="Armor & Thresholds" defaultOpen>
        <p className="mb-2 text-[11px] text-ink-muted">
          Score <span className="font-semibold text-ink">{char.armorScore}</span>
          {char.armorName && <span className="text-ink-faint"> · {char.armorName}</span>}
        </p>
        {char.armorSlots.max > 0 && (
          <div className="mb-2">
            <p className="mb-1 text-[10px] text-ink-faint">Armor slots ({char.armorSlots.marked}/{char.armorSlots.max})</p>
            <div className="flex flex-wrap gap-1 text-oxblood">
              {Array.from({ length: char.armorSlots.max }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => onToggleArmorSlot(i)}
                  className={`tick tick-box ${
                    i < char.armorSlots.marked ? 'tick-filled' : ''
                  } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                />
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="border border-ink/15 p-2 text-center">
            <p className="font-display text-[10px] uppercase tracking-wide text-stress">Major</p>
            <p className="font-display text-lg font-semibold text-ink">{char.damageThresholds.major}</p>
          </div>
          <div className="border border-ink/15 p-2 text-center">
            <p className="font-display text-[10px] uppercase tracking-wide text-oxblood">Severe</p>
            <p className="font-display text-lg font-semibold text-ink">{char.damageThresholds.severe}</p>
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
                className={`relative flex w-full items-center justify-between border border-ink/15 px-2 py-1.5 pr-6 ${
                  marked ? 'border-oxblood/40 bg-oxblood/8' : ''
                } ${
                  clickable
                    ? 'cursor-pointer transition-colors hover:border-oxblood/30'
                    : ''
                }`}
              >
                <span className="truncate text-[11px] text-ink-muted">{t.name}</span>
                <span className="font-display text-sm font-semibold text-ink">
                  {val >= 0 ? '+' : ''}
                  {val}
                </span>
                {marked && (
                  <span
                    className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center border border-oxblood bg-oxblood text-[8px] text-parchment"
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
            <div className="mt-2 space-y-1 border-t border-ink/15 pt-2">
              <p className="text-[10px] text-ink-faint">Add card (DM)</p>
              {availableDomainCardsForDm.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onAddDomainCard(c.id)}
                  className="block w-full truncate border border-ink/15 px-2 py-1 text-left text-[11px] text-ink hover:bg-black/5"
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
          <p className="text-[11px] leading-relaxed text-ink">{hopeFeature}</p>
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
              <p className="text-[11px] font-medium text-oxblood">{ancestry.name}</p>
              <ul className="mt-0.5 space-y-0.5">
                {ancestry.abilities.map((ab) => (
                  <li key={ab} className="text-[11px] text-ink-muted">· {ab}</li>
                ))}
              </ul>
            </div>
          )}
          {community && (
            <div>
              <p className="text-[11px] font-medium text-oxblood">{community.name}</p>
              <p className="text-[11px] text-ink-muted">{community.feature}</p>
            </div>
          )}
        </SessionSection>
      )}

      {transformation && (
        <SessionSection title="Transformation">
          <p className="text-[11px] text-ink-muted">{transformation.description}</p>
          <ul className="mt-1 space-y-0.5">
            {transformation.abilities.map((ab) => (
              <li key={ab.name} className="text-[11px] text-ink-muted">
                <span className="text-oxblood">{ab.name}:</span> {ab.description}
              </li>
            ))}
          </ul>
        </SessionSection>
      )}

      {char.experienceEntries.some((e) => e.name.trim()) && (
        <SessionSection title="Experiences">
          <div className="space-y-1">
            {char.experienceEntries.filter((e) => e.name.trim()).map((exp) => (
              <div key={exp.name} className="flex items-center justify-between border-b border-ink/15 px-1 py-1">
                <span className="truncate text-[11px] italic text-ink">{exp.name}</span>
                <span className="text-[11px] text-ink-faint">+{exp.bonus}</span>
              </div>
            ))}
          </div>
        </SessionSection>
      )}

      {(char.inventory.length > 0 || canEdit) && (
        <SessionSection title="Inventory">
          <div className="space-y-1">
            {char.inventory.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-ink/15 px-1 py-1">
                <span className="truncate text-[11px] text-ink">{item.name}</span>
                <span className="text-[11px] text-ink-faint">×{item.quantity}</span>
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
        <div className="space-y-2 border-t border-ink/15 pt-3">
          <Textarea
            label="Notes"
            value={char.notes ?? ''}
            onChange={(e) => onUpdateNotes(e.target.value)}
            className="min-h-16 text-xs"
          />
          {saving && (
            <p className="text-center text-[10px] text-ink-faint">Saving…</p>
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
    <div className="border border-ink/15">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-2.5 py-2 text-left"
      >
        <span className="font-display text-xs font-semibold tracking-wide text-oxblood">{title}</span>
        <span className="text-[10px] text-ink-faint">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="border-t border-ink/10 px-2.5 pb-2.5">{children}</div>}
    </div>
  );
}

function SessionResource({
  label,
  current,
  max,
  color,
  onAdjust,
  variant = 'dot',
}: {
  label: string;
  current: number;
  max: number;
  color: string;
  onAdjust?: (delta: number) => void;
  variant?: 'dot' | 'box' | 'diamond';
}) {
  return (
    <div className={`px-2 py-1.5 text-center ${color}`}>
      <p className="font-display text-[10px] uppercase tracking-[0.16em]">{label}</p>
      <TickTrack current={current} max={max} variant={variant} className="mt-1" />
      <div className="flex items-center justify-center gap-1">
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(-1)} className="px-0.5 text-xs text-ink-faint hover:text-ink">−</button>
        )}
        <span className="font-display text-lg font-semibold">{current}/{max}</span>
        {onAdjust && (
          <button type="button" onClick={() => onAdjust(1)} className="px-0.5 text-xs text-ink-faint hover:text-ink">+</button>
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
    <div className="border border-ink/15">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-2 py-1.5 text-left">
        <span className="truncate text-[11px] font-medium text-ink">{card.name}</span>
        <span className="ml-1 shrink-0 text-[10px] text-ink-faint">L{card.level}</span>
      </button>
      {expanded && (
        <div className="border-t border-ink/10 px-2 py-1.5">
          <p className="text-[10px] text-ink-faint">{domain?.name ?? card.domainId} · {card.type ?? 'ability'}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{card.description}</p>
          {card.recallCost != null && (
            <p className="mt-0.5 text-[10px] text-ink-faint">Recall: {card.recallCost} Stress</p>
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
        <div key={a.id ?? i} className="border-b border-ink/10 px-1 py-1.5">
          <p className="text-[11px] font-medium text-ink">{a.name}</p>
          {!compact && <p className="text-[11px] text-ink-muted">{a.description}</p>}
          {compact && <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-ink-faint">{a.description}</p>}
        </div>
      ))}
    </div>
  );
}

function Chip({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className={`border px-1.5 py-0.5 font-display text-[10px] tracking-wide ${
        accent
          ? 'border-hope/40 text-hope'
          : 'border-ink/20 text-ink-muted'
      }`}
    >
      {label}
    </span>
  );
}
