import domainCardsCatalog from '../config/daggerheart/domain-cards.json';
import domains from '../config/daggerheart/domains.json';
import type {
  Character,
  CrafterInstrument,
  CrafterTechnology,
  DomainCard,
  InstrumentTarget,
  SubclassStage,
  TraitId,
} from '../types';
import { getSubclassTracks } from './subclasses';

export const CRAFTER_SUBCLASS_ID = 'crafter';

export interface ResolvedInstrumentBonus {
  instrument: CrafterInstrument;
  bonus: number;
  crafterId: string;
  crafterName: string;
  stage: SubclassStage;
}

export interface InstrumentExperience {
  name: string;
  bonus: number;
  instrumentName: string;
  crafterName: string;
}

/** Highest Crafter subclass stage on this character, or null if not a Crafter. */
export function crafterStage(char: Character): SubclassStage | null {
  const track = getSubclassTracks(char).find((t) => t.subclassId === CRAFTER_SUBCLASS_ID);
  return track?.stage ?? null;
}

export function maxInstruments(stage: SubclassStage): number {
  return stage === 'foundation' ? 1 : 2;
}

export function allowedTargets(stage: SubclassStage): InstrumentTarget[] {
  if (stage === 'foundation') return ['experience'];
  return ['experience', 'evasion', 'trait'];
}

export function instrumentBonus(stage: SubclassStage, target: InstrumentTarget): number {
  if (target === 'experience') return stage === 'foundation' ? 2 : 3;
  return 1;
}

export function isInstrumentTargetAllowed(
  stage: SubclassStage,
  target: InstrumentTarget,
): boolean {
  return allowedTargets(stage).includes(target);
}

/** All instruments owned by `ownerId` across every Crafter in the party. */
export function instrumentBonusesFor(
  ownerId: string,
  party: Character[],
): ResolvedInstrumentBonus[] {
  const results: ResolvedInstrumentBonus[] = [];
  for (const crafter of party) {
    const stage = crafterStage(crafter);
    if (!stage) continue;
    for (const instrument of crafter.instruments ?? []) {
      if (instrument.ownerId !== ownerId) continue;
      if (!isInstrumentTargetAllowed(stage, instrument.target)) continue;
      results.push({
        instrument,
        bonus: instrumentBonus(stage, instrument.target),
        crafterId: crafter.id,
        crafterName: crafter.name,
        stage,
      });
    }
  }
  return results;
}

export function evasionBonusFromInstruments(ownerId: string, party: Character[]): number {
  return instrumentBonusesFor(ownerId, party)
    .filter((b) => b.instrument.target === 'evasion')
    .reduce((sum, b) => sum + b.bonus, 0);
}

export function effectiveEvasion(char: Character, party: Character[]): number {
  return char.evasion + evasionBonusFromInstruments(char.id, party);
}

export function traitBonuses(
  ownerId: string,
  party: Character[],
): Partial<Record<TraitId, number>> {
  const bonuses: Partial<Record<TraitId, number>> = {};
  for (const entry of instrumentBonusesFor(ownerId, party)) {
    if (entry.instrument.target !== 'trait' || !entry.instrument.traitId) continue;
    const traitId = entry.instrument.traitId;
    bonuses[traitId] = (bonuses[traitId] ?? 0) + entry.bonus;
  }
  return bonuses;
}

export function effectiveTrait(
  char: Character,
  traitId: TraitId,
  party: Character[],
): number {
  return char.traits[traitId] + (traitBonuses(char.id, party)[traitId] ?? 0);
}

export function instrumentExperiences(
  ownerId: string,
  party: Character[],
): InstrumentExperience[] {
  return instrumentBonusesFor(ownerId, party)
    .filter((b) => b.instrument.target === 'experience' && b.instrument.experienceName?.trim())
    .map((b) => ({
      name: b.instrument.experienceName!.trim(),
      bonus: b.bonus,
      instrumentName: b.instrument.name,
      crafterName: b.crafterName,
    }));
}

export function domainLabel(domainId: string): string {
  return domains.find((d) => d.id === domainId)?.name ?? domainId;
}

/** Domain cards of any domain, up to the given character level. */
export function replicableCards(level: number): DomainCard[] {
  return domainCardsCatalog
    .filter((c) => c.level <= level)
    .map((c) => ({
      id: c.id,
      domainId: c.domain,
      level: c.level,
      name: c.name,
      description: c.description,
      type: c.type,
      recallCost: c.recallCost,
    }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export function startTechnology(card: DomainCard): CrafterTechnology {
  return { card, countdown: card.level };
}

export function tickTechnology(tech: CrafterTechnology): CrafterTechnology {
  return { ...tech, countdown: Math.max(0, tech.countdown - 1) };
}

export function technologyIsReady(tech: CrafterTechnology): boolean {
  return tech.countdown <= 0;
}

export function targetLabel(target: InstrumentTarget): string {
  if (target === 'experience') return 'Experience';
  if (target === 'evasion') return 'Evasion';
  return 'Trait';
}
