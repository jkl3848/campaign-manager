import { useState } from 'react';
import type { Character, LevelUpChoice, MulticlassInfo, TraitId } from '../../types';
import classes from '../../config/daggerheart/classes.json';
import traits from '../../config/daggerheart/traits.json';
import domains from '../../config/daggerheart/domains.json';
import {
  completeLevelUp,
  getAdvancementDef,
  getAvailableAdvancements,
  getDomainCardOptions,
  getMilestoneSummary,
  getTierForLevel,
  getUnmarkedTraits,
  isMilestoneLevel,
  previewLevelUpChoices,
  type AvailableAdvancement,
} from '../../lib/levelUp';
import {
  getSubclassUpgradeTargets,
  nextSubclassStage,
  stageLabel,
  type SubclassTrack,
} from '../../lib/subclasses';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface LevelUpWizardProps {
  character: Character;
  onComplete: (character: Character) => Promise<void>;
  onCancel: () => void;
}

type WizardPhase = 'intro' | 'experience' | 'pick' | 'configure' | 'review';

export function LevelUpWizard({ character, onComplete, onCancel }: LevelUpWizardProps) {
  const targetLevel = character.pendingLevelUp!.targetLevel;
  const isMilestone = isMilestoneLevel(targetLevel);
  const milestoneSummary = getMilestoneSummary(targetLevel);

  const [phase, setPhase] = useState<WizardPhase>(isMilestone ? 'intro' : 'pick');
  const [newExperienceName, setNewExperienceName] = useState('');
  const [choices, setChoices] = useState<LevelUpChoice[]>([]);
  const [picksRemaining, setPicksRemaining] = useState(2);
  const [pendingAdvancement, setPendingAdvancement] = useState<AvailableAdvancement | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [traitPick, setTraitPick] = useState<[TraitId | '', TraitId | '']>(['', '']);
  const [expPick, setExpPick] = useState<[number | '', number | '']>(['', '']);
  const [domainCardId, setDomainCardId] = useState('');
  const [hpAmount, setHpAmount] = useState(1);
  const [stressAmount, setStressAmount] = useState(1);
  const [multiclassForm, setMulticlassForm] = useState<MulticlassInfo>({
    classId: '',
    domainId: '',
    subclassId: '',
  });
  const [subclassUpgradeSource, setSubclassUpgradeSource] = useState<'primary' | 'multiclass'>('primary');

  const previewChar = previewLevelUpChoices(character, choices);
  const available = getAvailableAdvancements(previewChar, targetLevel);
  const subclassUpgradeTargets = getSubclassUpgradeTargets(previewChar, targetLevel);
  const domainOptions = getDomainCardOptions(previewChar, targetLevel);
  const unmarkedTraits = getUnmarkedTraits(previewChar);
  const experiences = previewChar.experienceEntries.filter((e) => e.name.trim());

  const picksUsed = choices.reduce((sum, c) => {
    const def = available.find((a) => a.def.id === c.advancementId)?.def;
    return sum + (def?.pickCost ?? 1);
  }, 0);

  const startPick = () => {
    setError('');
    setPendingAdvancement(null);
    setTraitPick(['', '']);
    setExpPick(['', '']);
    setDomainCardId('');
    setHpAmount(1);
    setStressAmount(1);
    setMulticlassForm({ classId: '', domainId: '', subclassId: '' });
    setSubclassUpgradeSource('primary');
    setPhase('pick');
  };

  const selectAdvancement = (item: AvailableAdvancement) => {
    if (item.def.pickCost > picksRemaining) {
      setError(`${item.def.name} requires ${item.def.pickCost} picks.`);
      return;
    }
    setPendingAdvancement(item);
    setError('');

    const subclassTargets = item.def.id === 'subclass-upgrade'
      ? getSubclassUpgradeTargets(previewChar, targetLevel)
      : [];
    const needsConfig =
      ['trait-increase', 'experience-boost', 'domain-card', 'hp-slot', 'stress-slot', 'multiclass'].includes(item.def.id)
      || (item.def.id === 'subclass-upgrade' && subclassTargets.length > 1);

    if (needsConfig) {
      if (item.def.id === 'subclass-upgrade' && subclassTargets[0]) {
        setSubclassUpgradeSource(subclassTargets[0].source);
      }
      setPhase('configure');
    } else if (item.def.id === 'subclass-upgrade') {
      confirmAdvancement(item, {
        subclassUpgradeSource: subclassTargets[0]?.source ?? 'primary',
      });
    } else {
      confirmAdvancement(item, {});
    }
  };

  const confirmAdvancement = (item: AvailableAdvancement, data: LevelUpChoice['data']) => {
    const choice: LevelUpChoice = {
      advancementId: item.def.id,
      tier: item.tier,
      data,
    };
    const newChoices = [...choices, choice];
    const remaining = picksRemaining - item.def.pickCost;

    setChoices(newChoices);
    setPicksRemaining(remaining);
    setPendingAdvancement(null);

    if (remaining > 0) {
      startPick();
    } else {
      setPhase('review');
    }
  };

  const handleConfigureConfirm = () => {
    if (!pendingAdvancement) return;
    const { def } = pendingAdvancement;

    if (def.id === 'trait-increase') {
      if (!traitPick[0] || !traitPick[1] || traitPick[0] === traitPick[1]) {
        setError('Select two different unmarked traits.');
        return;
      }
      confirmAdvancement(pendingAdvancement, { traits: [traitPick[0], traitPick[1]] });
    } else if (def.id === 'experience-boost') {
      if (expPick[0] === '' || expPick[1] === '' || expPick[0] === expPick[1]) {
        setError('Select two different experiences.');
        return;
      }
      confirmAdvancement(pendingAdvancement, { experienceIndices: [expPick[0], expPick[1]] });
    } else if (def.id === 'domain-card') {
      if (!domainCardId) {
        setError('Select a domain card.');
        return;
      }
      confirmAdvancement(pendingAdvancement, { domainCardId });
    } else if (def.id === 'hp-slot') {
      confirmAdvancement(pendingAdvancement, { hpAmount: Math.max(1, hpAmount) });
    } else if (def.id === 'stress-slot') {
      confirmAdvancement(pendingAdvancement, { stressAmount: Math.max(1, stressAmount) });
    } else if (def.id === 'multiclass') {
      if (!multiclassForm.classId || !multiclassForm.domainId || !multiclassForm.subclassId) {
        setError('Complete multiclass selection.');
        return;
      }
      if (multiclassForm.classId === character.classId) {
        setError('Choose a different class for multiclass.');
        return;
      }
      confirmAdvancement(pendingAdvancement, { multiclass: multiclassForm });
    } else if (def.id === 'subclass-upgrade') {
      confirmAdvancement(pendingAdvancement, { subclassUpgradeSource });
    }
  };

  const handleFinish = async () => {
    setError('');
    setSaving(true);
    try {
      const updated = completeLevelUp(character, choices, isMilestone ? newExperienceName : undefined);
      await onComplete(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to complete level up.');
      setSaving(false);
    }
  };

  const mcClassOptions = classes.filter((c) => c.id !== character.classId);
  const mcSelectedClass = mcClassOptions.find((c) => c.id === multiclassForm.classId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto folio rounded-sm shadow-2xl">
        <div className="border-b border-brass/25 px-6 py-4">
          <h2 className="font-display text-2xl font-semibold tracking-wide text-amber-100">
            Level Up — Level {targetLevel}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Tier {getTierForLevel(targetLevel)} · {picksUsed}/2 advancement picks used
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {phase === 'intro' && (
            <>
              <p className="text-slate-300">
                Reaching level {targetLevel} grants automatic benefits before you choose advancements:
              </p>
              <ul className="space-y-2">
                {milestoneSummary.map((line) => (
                  <li key={line} className="flex gap-2 text-sm text-amber-200">
                    <span className="text-amber-500">✦</span>
                    {line}
                  </li>
                ))}
              </ul>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button onClick={() => setPhase('experience')}>Continue</Button>
              </div>
            </>
          )}

          {phase === 'experience' && (
            <>
              <p className="text-sm text-slate-400">
                Name your new Experience. It starts at +2 and can be boosted by future advancements.
              </p>
              <Input
                label="New Experience"
                value={newExperienceName}
                onChange={(e) => setNewExperienceName(e.target.value)}
                placeholder="e.g. Monster Hunter, Court Intrigue..."
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setPhase('intro')}>Back</Button>
                <Button
                  disabled={!newExperienceName.trim()}
                  onClick={() => startPick()}
                >
                  Choose Advancements
                </Button>
              </div>
            </>
          )}

          {phase === 'pick' && (
            <>
              <p className="text-sm text-slate-400">
                {picksRemaining === 2
                  ? 'Choose two advancements with at least one unmarked slot from your tier or below.'
                  : `Choose ${picksRemaining} more advancement${picksRemaining > 1 ? 's' : ''}.`}
              </p>
              <div className="grid gap-3">
                {available.map((item) => (
                  <AdvancementOptionCard
                    key={`${item.tier}-${item.def.id}`}
                    item={item}
                    description={
                      item.def.id === 'subclass-upgrade'
                        ? subclassUpgradeSummary(subclassUpgradeTargets)
                        : undefined
                    }
                    onSelect={() => selectAdvancement(item)}
                    disabled={item.def.pickCost > picksRemaining}
                  />
                ))}
                {available.length === 0 && (
                  <p className="text-sm text-slate-500">No advancements available.</p>
                )}
              </div>
              {choices.length > 0 && (
                <div className="border-t border-slate-700/40 pt-3">
                  <p className="mb-2 text-xs text-slate-500">Selected</p>
                  <SelectedChoicesList choices={choices} />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                {picksRemaining === 0 && (
                  <Button onClick={() => setPhase('review')}>Review</Button>
                )}
              </div>
            </>
          )}

          {phase === 'configure' && pendingAdvancement && (
            <>
              <h3 className="font-serif text-lg text-amber-200">{pendingAdvancement.def.name}</h3>
              <p className="text-sm text-slate-400">{pendingAdvancement.def.description}</p>

              {pendingAdvancement.def.id === 'trait-increase' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    label="First trait"
                    value={traitPick[0]}
                    onChange={(e) => setTraitPick([e.target.value as TraitId, traitPick[1]])}
                  >
                    <option value="">Select...</option>
                    {unmarkedTraits.map((t) => (
                      <option key={t} value={t} disabled={t === traitPick[1]}>
                        {traits.find((tr) => tr.id === t)?.name ?? t}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Second trait"
                    value={traitPick[1]}
                    onChange={(e) => setTraitPick([traitPick[0], e.target.value as TraitId])}
                  >
                    <option value="">Select...</option>
                    {unmarkedTraits.map((t) => (
                      <option key={t} value={t} disabled={t === traitPick[0]}>
                        {traits.find((tr) => tr.id === t)?.name ?? t}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {pendingAdvancement.def.id === 'experience-boost' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    label="First experience"
                    value={expPick[0] === '' ? '' : String(expPick[0])}
                    onChange={(e) =>
                      setExpPick([e.target.value === '' ? '' : parseInt(e.target.value), expPick[1]])
                    }
                  >
                    <option value="">Select...</option>
                    {experiences.map((exp, i) => (
                      <option key={i} value={i} disabled={expPick[1] === i}>
                        {exp.name} (+{exp.bonus})
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Second experience"
                    value={expPick[1] === '' ? '' : String(expPick[1])}
                    onChange={(e) =>
                      setExpPick([expPick[0], e.target.value === '' ? '' : parseInt(e.target.value)])
                    }
                  >
                    <option value="">Select...</option>
                    {experiences.map((exp, i) => (
                      <option key={i} value={i} disabled={expPick[0] === i}>
                        {exp.name} (+{exp.bonus})
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {pendingAdvancement.def.id === 'domain-card' && (
                <Select
                  label="Domain card"
                  value={domainCardId}
                  onChange={(e) => setDomainCardId(e.target.value)}
                >
                  <option value="">Select a card...</option>
                  {domainOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Lv {c.level}, {domains.find((d) => d.id === c.domain)?.name ?? c.domain})
                    </option>
                  ))}
                </Select>
              )}

              {pendingAdvancement.def.id === 'hp-slot' && (
                <Input
                  label="Hit Point slots to add"
                  type="number"
                  min={1}
                  max={3}
                  value={hpAmount}
                  onChange={(e) => setHpAmount(parseInt(e.target.value) || 1)}
                />
              )}

              {pendingAdvancement.def.id === 'stress-slot' && (
                <Input
                  label="Stress slots to add"
                  type="number"
                  min={1}
                  max={3}
                  value={stressAmount}
                  onChange={(e) => setStressAmount(parseInt(e.target.value) || 1)}
                />
              )}

              {pendingAdvancement.def.id === 'subclass-upgrade' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">
                    Choose which subclass to upgrade. Specialization is available from level 5; Mastery from level 8. You cannot have Mastery in more than one subclass.
                  </p>
                  <Select
                    label="Subclass"
                    value={subclassUpgradeSource}
                    onChange={(e) => setSubclassUpgradeSource(e.target.value as 'primary' | 'multiclass')}
                  >
                    {subclassUpgradeTargets.map((track) => (
                      <option key={track.source} value={track.source}>
                        {upgradeOptionLabel(track)}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {pendingAdvancement.def.id === 'multiclass' && (
                <div className="space-y-3">
                  <Select
                    label="Additional class"
                    value={multiclassForm.classId}
                    onChange={(e) =>
                      setMulticlassForm({
                        classId: e.target.value,
                        domainId: '',
                        subclassId: '',
                      })
                    }
                  >
                    <option value="">Select class...</option>
                    {mcClassOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                  {mcSelectedClass && (
                    <>
                      <Select
                        label="Multiclass domain"
                        value={multiclassForm.domainId}
                        onChange={(e) => setMulticlassForm({ ...multiclassForm, domainId: e.target.value })}
                      >
                        <option value="">Select domain...</option>
                        {mcSelectedClass.domains.map((d) => (
                          <option key={d} value={d}>
                            {domains.find((dom) => dom.id === d)?.name ?? d}
                          </option>
                        ))}
                      </Select>
                      <Select
                        label="Subclass (foundation card)"
                        value={multiclassForm.subclassId}
                        onChange={(e) => setMulticlassForm({ ...multiclassForm, subclassId: e.target.value })}
                      >
                        <option value="">Select subclass...</option>
                        {mcSelectedClass.subclasses.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </Select>
                    </>
                  )}
                  <p className="text-xs text-slate-500">
                    Uses both advancement picks. You cannot have Mastery in more than one subclass.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={startPick}>Back</Button>
                <Button onClick={handleConfigureConfirm}>Confirm</Button>
              </div>
            </>
          )}

          {phase === 'review' && (
            <>
              {isMilestone && newExperienceName && (
                <div className="rounded-lg bg-amber-950/30 p-3">
                  <p className="text-xs text-slate-500">New Experience</p>
                  <p className="text-amber-200">{newExperienceName} (+2)</p>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-300">Automatic benefits</p>
                {isMilestone ? (
                  <ul className="text-sm text-slate-400">
                    <li>+1 Proficiency</li>
                    {(targetLevel === 5 || targetLevel === 8) && <li>Clear marked traits</li>}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Level {targetLevel} — advancement choices only.</p>
                )}
              </div>
              <SelectedChoicesList choices={choices} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={startPick}>Edit Choices</Button>
                <Button onClick={handleFinish} disabled={saving}>
                  {saving ? 'Saving...' : `Complete Level Up`}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function upgradeOptionLabel(track: SubclassTrack): string {
  const next = nextSubclassStage(track.stage);
  const source = track.source === 'multiclass' ? 'Multiclass' : 'Class';
  return `${track.name} (${source}) — ${stageLabel(track.stage)} → ${next ? stageLabel(next) : 'Max'}`;
}

function subclassUpgradeSummary(targets: SubclassTrack[]): string {
  if (targets.length === 1) {
    const next = nextSubclassStage(targets[0].stage);
    return `Gain ${next ? stageLabel(next) : 'the next card'} for ${targets[0].name}. Specialization is available at tier 3 (levels 5–7); Mastery at tier 4 (levels 8–10). Only one Mastery allowed.`;
  }
  return 'Choose a subclass to take its next card. Specialization is available at tier 3 (levels 5–7); Mastery at tier 4 (levels 8–10). You cannot have Mastery in more than one subclass.';
}

function AdvancementOptionCard({
  item,
  onSelect,
  disabled,
  description,
}: {
  item: AvailableAdvancement;
  onSelect: () => void;
  disabled?: boolean;
  description?: string;
}) {
  const { def, tier } = item;
  const isDouble = def.pickCost === 2;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`rounded-lg border p-4 text-left transition-all ${
        isDouble
          ? 'border-amber-600/60 bg-amber-950/20 hover:border-amber-500/80'
          : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'
      } ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-slate-100">{def.name}</p>
        <span className="shrink-0 text-xs text-slate-500">Tier {tier}</span>
      </div>
      <p className="mt-1 text-sm text-slate-400">{description ?? def.description}</p>
      {isDouble && (
        <p className="mt-2 text-xs font-medium text-amber-400">Uses both advancement picks</p>
      )}
    </button>
  );
}

function SelectedChoicesList({ choices }: { choices: LevelUpChoice[] }) {
  return (
    <ul className="space-y-2">
      {choices.map((c, i) => {
        const def = getAdvancementDef(c.advancementId);
        return (
          <li key={i} className="rounded bg-slate-800/60 px-3 py-2 text-sm text-slate-300">
            {def?.name ?? c.advancementId} (Tier {c.tier})
          </li>
        );
      })}
    </ul>
  );
}
