import { useMemo, useState } from 'react';
import type {
  Character,
  CrafterInstrument,
  CrafterTechnology,
  InstrumentTarget,
  TraitId,
} from '../../types';
import {
  allowedTargets,
  crafterStage,
  domainLabel,
  instrumentBonus,
  maxInstruments,
  replicableCards,
  startTechnology,
  targetLabel,
  technologyIsReady,
  tickTechnology,
} from '../../lib/crafter';
import traits from '../../config/daggerheart/traits.json';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SearchableSelect } from '../ui/SearchableSelect';

interface CrafterWorkshopProps {
  char: Character;
  party: Character[];
  canEdit: boolean;
  compact?: boolean;
  onChange: (partial: Partial<Character>) => void;
}

export function CrafterWorkshop({
  char,
  party,
  canEdit,
  compact = false,
  onChange,
}: CrafterWorkshopProps) {
  const stage = crafterStage(char);
  if (!stage) return null;

  const instruments = char.instruments ?? [];
  const cap = maxInstruments(stage);
  const targets = allowedTargets(stage);
  const atCap = instruments.length >= cap;
  const isMastery = stage === 'mastery';
  const owners = party.length > 0 ? party : [char];

  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState(char.id);
  const [target, setTarget] = useState<InstrumentTarget>('experience');
  const [experienceName, setExperienceName] = useState('');
  const [traitId, setTraitId] = useState<TraitId>('knowledge');

  const cardOptions = useMemo(
    () =>
      replicableCards(char.level).map((c) => ({
        value: c.id,
        label: c.name,
        detail: `Lv ${c.level}${c.type ? ` · ${c.type}` : ''}`,
        group: domainLabel(c.domainId),
      })),
    [char.level],
  );

  const setInstruments = (next: CrafterInstrument[]) => {
    onChange({ instruments: next });
  };

  const setTechnology = (technology: CrafterTechnology | undefined) => {
    onChange({ technology });
  };

  const addInstrument = () => {
    if (!canEdit || atCap) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (!targets.includes(target)) return;

    const instrument: CrafterInstrument = {
      id: crypto.randomUUID(),
      name: trimmedName,
      ownerId,
      target,
    };
    if (target === 'experience') {
      const exp = experienceName.trim();
      if (!exp) return;
      instrument.experienceName = exp;
    }
    if (target === 'trait') {
      instrument.traitId = traitId;
    }

    setInstruments([...instruments, instrument]);
    setName('');
    setExperienceName('');
  };

  const removeInstrument = (id: string) => {
    setInstruments(instruments.filter((i) => i.id !== id));
  };

  const clearAll = () => {
    setInstruments([]);
  };

  const selectTechnologyCard = (cardId: string) => {
    const card = replicableCards(char.level).find((c) => c.id === cardId);
    if (!card || char.technology) return;
    setTechnology(startTechnology(card));
  };

  const ownerName = (id: string) =>
    owners.find((c) => c.id === id)?.name ?? 'Unknown';

  const textSize = compact ? 'text-[11px]' : 'text-sm';
  const muted = compact ? 'text-ink-faint' : 'text-ink-muted';
  const heading = compact ? 'text-[10px]' : 'text-xs';

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <p className={`font-serif ${textSize} ${muted}`}>
        {stage === 'foundation'
          ? 'Build 1 Dedicated Instrument each long rest (+2 Experience).'
          : `Up to ${cap} instruments. Experience +${instrumentBonus(stage, 'experience')}; Evasion/Trait +1.`}
        {isMastery && ' Mastery unlocks a Technology that can replicate any domain card.'}
      </p>

      {instruments.length > 0 ? (
        <ul className="space-y-1.5">
          {instruments.map((inst) => {
            const bonus = instrumentBonus(stage, inst.target);
            const detail =
              inst.target === 'experience'
                ? `${inst.experienceName ?? '—'} +${bonus}`
                : inst.target === 'trait'
                  ? `${traits.find((t) => t.id === inst.traitId)?.name ?? inst.traitId} +${bonus}`
                  : `Evasion +${bonus}`;
            return (
              <li
                key={inst.id}
                className={`flex items-start justify-between gap-2 border border-ink/15 ${
                  compact ? 'px-2 py-1.5' : 'px-3 py-2'
                }`}
              >
                <div className="min-w-0">
                  <p className={`font-display font-semibold text-ink ${compact ? 'text-sm' : 'text-base'}`}>
                    {inst.name}
                  </p>
                  <p className={`${textSize} ${muted}`}>
                    {ownerName(inst.ownerId)} · {targetLabel(inst.target)} · {detail}
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => removeInstrument(inst.id)}
                    className={`shrink-0 ${muted} hover:text-oxblood`}
                    title="Dismantle instrument"
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={`font-serif italic ${textSize} ${muted}`}>No active instruments.</p>
      )}

      {canEdit && (
        <div className={`space-y-2 border border-ink/15 ${compact ? 'p-2' : 'p-3'}`}>
          <p className={`font-sans font-semibold uppercase tracking-wide text-oxblood ${heading}`}>
            Build instrument ({instruments.length}/{cap})
          </p>
          <Input
            label={compact ? undefined : 'Instrument name'}
            placeholder="Instrument name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={atCap}
          />
          <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
            <label className="block">
              <span className={`mb-1 block font-sans font-semibold uppercase tracking-wide ${heading} ${muted}`}>
                Owner
              </span>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                disabled={atCap}
                className="w-full border border-ink/25 bg-transparent px-2 py-1.5 font-serif text-sm text-ink"
              >
                {owners.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.id === char.id ? ' (you)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={`mb-1 block font-sans font-semibold uppercase tracking-wide ${heading} ${muted}`}>
                Target
              </span>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as InstrumentTarget)}
                disabled={atCap}
                className="w-full border border-ink/25 bg-transparent px-2 py-1.5 font-serif text-sm text-ink"
              >
                {targets.map((t) => (
                  <option key={t} value={t}>
                    {targetLabel(t)} (+{instrumentBonus(stage, t)})
                  </option>
                ))}
              </select>
            </label>
          </div>
          {target === 'experience' && (
            <Input
              label={compact ? undefined : 'Experience name'}
              placeholder="New or existing experience"
              value={experienceName}
              onChange={(e) => setExperienceName(e.target.value)}
              disabled={atCap}
            />
          )}
          {target === 'trait' && (
            <label className="block">
              <span className={`mb-1 block font-sans font-semibold uppercase tracking-wide ${heading} ${muted}`}>
                Trait
              </span>
              <select
                value={traitId}
                onChange={(e) => setTraitId(e.target.value as TraitId)}
                disabled={atCap}
                className="w-full border border-ink/25 bg-transparent px-2 py-1.5 font-serif text-sm text-ink"
              >
                {traits.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={addInstrument} disabled={atCap || !name.trim()}>
              Build
            </Button>
            {instruments.length > 0 && (
              <Button size="sm" variant="ghost" onClick={clearAll}>
                Long rest: clear all
              </Button>
            )}
          </div>
        </div>
      )}

      {isMastery && (
        <div className={`space-y-2 border border-ink/20 ${compact ? 'p-2' : 'p-3'}`}>
          <p className={`font-sans font-semibold uppercase tracking-wide text-oxblood ${heading}`}>
            Master Technology
          </p>
          {char.technology ? (
            <TechnologyProject
              tech={char.technology}
              canEdit={canEdit}
              compact={compact}
              onTick={() => setTechnology(tickTechnology(char.technology!))}
              onDismantle={() => setTechnology(undefined)}
            />
          ) : canEdit ? (
            <SearchableSelect
              label="Replicate domain card"
              placeholder="Search any domain card..."
              options={cardOptions}
              onSelect={selectTechnologyCard}
              emptyText="No cards at your level"
            />
          ) : (
            <p className={`font-serif italic ${textSize} ${muted}`}>No Technology project.</p>
          )}
        </div>
      )}
    </div>
  );
}

function TechnologyProject({
  tech,
  canEdit,
  compact,
  onTick,
  onDismantle,
}: {
  tech: CrafterTechnology;
  canEdit: boolean;
  compact: boolean;
  onTick: () => void;
  onDismantle: () => void;
}) {
  const ready = technologyIsReady(tech);
  const textSize = compact ? 'text-[11px]' : 'text-sm';

  return (
    <div className="space-y-2">
      <div>
        <p className={`font-display font-semibold text-ink ${compact ? 'text-sm' : 'text-base'}`}>
          {tech.card.name}
        </p>
        <p className={`${textSize} text-ink-muted`}>
          {domainLabel(tech.card.domainId)} · Lv {tech.card.level}
          {tech.card.type ? ` · ${tech.card.type}` : ''}
          {ready ? ' · Ready' : ` · Countdown ${tech.countdown}`}
        </p>
      </div>
      {ready ? (
        <p className={`font-serif leading-relaxed text-ink ${textSize}`}>{tech.card.description}</p>
      ) : (
        <p className={`font-serif italic ${textSize} text-ink-muted`}>
          Project in progress. Tick the countdown as you advance the work.
        </p>
      )}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          {!ready && (
            <Button size="sm" onClick={onTick}>
              Advance (−1)
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDismantle}>
            Dismantle
          </Button>
        </div>
      )}
    </div>
  );
}
