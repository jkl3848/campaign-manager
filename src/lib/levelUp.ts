import advancementsConfig from '../config/daggerheart/advancements.json';
import classes from '../config/daggerheart/classes.json';
import domainCardsCatalog from '../config/daggerheart/domain-cards.json';
import type {
  Character,
  DomainCard,
  ExperienceEntry,
  LevelUpChoice,
  MulticlassInfo,
  PendingLevelUp,
  Tier,
  TraitId,
} from '../types';
import { computeArmorStats } from './characterArmor';

export interface AdvancementDefinition {
  id: string;
  name: string;
  description: string;
  totalSlots: number;
  pickCost: number;
}

const MILESTONE_LEVELS = advancementsConfig.milestoneLevels as number[];
const ADVANCEMENTS = advancementsConfig.advancements as AdvancementDefinition[];
const TIER_ADVANCEMENTS = advancementsConfig.tierAdvancements as Record<string, string[]>;

export function getTierForLevel(level: number): Tier {
  if (level <= 4) return 1;
  if (level <= 7) return 2;
  return 3;
}

export function isMilestoneLevel(level: number): boolean {
  return MILESTONE_LEVELS.includes(level);
}

export function slotKey(tier: Tier, advancementId: string): string {
  return `${tier}:${advancementId}`;
}

export function getAdvancementDef(id: string): AdvancementDefinition | undefined {
  return ADVANCEMENTS.find((a) => a.id === id);
}

export function getMarkedSlots(char: Character, tier: Tier, advancementId: string): number {
  return char.advancementSlots[slotKey(tier, advancementId)] ?? 0;
}

export function hasAvailableSlot(char: Character, tier: Tier, advancementId: string): boolean {
  const def = getAdvancementDef(advancementId);
  if (!def) return false;
  return getMarkedSlots(char, tier, advancementId) < def.totalSlots;
}

export function isAdvancementDisabled(char: Character, tier: Tier, advancementId: string): boolean {
  return char.disabledAdvancements.includes(slotKey(tier, advancementId));
}

export interface AvailableAdvancement {
  def: AdvancementDefinition;
  tier: Tier;
}

export function getAvailableAdvancements(char: Character, newLevel: number): AvailableAdvancement[] {
  const currentTier = getTierForLevel(newLevel);
  const available: AvailableAdvancement[] = [];

  for (let tier = 1 as Tier; tier <= currentTier; tier = (tier + 1) as Tier) {
    const ids = TIER_ADVANCEMENTS[String(tier)] ?? [];
    for (const id of ids) {
      const def = getAdvancementDef(id);
      if (!def) continue;
      if (isAdvancementDisabled(char, tier, id)) continue;
      if (!hasAvailableSlot(char, tier, id)) continue;

      if (id === 'subclass-upgrade') {
        if (char.subclassStage === 'mastery') continue;
        if (char.multiclass) continue;
      }
      if (id === 'multiclass') {
        if (char.multiclass) continue;
      }

      available.push({ def, tier });
    }
  }

  return available;
}

export function canInitiateLevelUp(char: Character): boolean {
  return char.level < 10 && !char.pendingLevelUp;
}

export function initiateLevelUp(char: Character): Character {
  if (!canInitiateLevelUp(char)) return char;
  const pending: PendingLevelUp = {
    targetLevel: char.level + 1,
    initiatedAt: Date.now(),
  };
  return { ...char, pendingLevelUp: pending };
}

export function cancelLevelUp(char: Character): Character {
  const { pendingLevelUp: _, ...rest } = char;
  return rest as Character;
}

export function incrementWeaponDamage(damage: string | undefined): string | undefined {
  if (!damage) return damage;
  const match = damage.match(/^(\d*)d(\d+)$/i);
  if (!match) return damage;
  const count = match[1] ? parseInt(match[1], 10) : 1;
  return `${count + 1}d${match[2]}`;
}

export function getDomainCardOptions(char: Character, newLevel: number): typeof domainCardsCatalog {
  const owned = new Set(char.domainCards.map((c) => c.id));

  if (char.multiclass) {
    const maxLevel = Math.floor(newLevel / 2);
    return domainCardsCatalog.filter(
      (c) =>
        c.domain === char.multiclass!.domainId &&
        c.level <= maxLevel &&
        !owned.has(c.id),
    );
  }

  const cls = classes.find((c) => c.id === char.classId);
  if (!cls) return [];
  return domainCardsCatalog.filter(
    (c) => cls.domains.includes(c.domain) && c.level <= newLevel && !owned.has(c.id),
  );
}

function markAdvancementSlot(
  slots: Record<string, number>,
  tier: Tier,
  advancementId: string,
): Record<string, number> {
  const key = slotKey(tier, advancementId);
  return { ...slots, [key]: (slots[key] ?? 0) + 1 };
}

function disableAdvancement(
  disabled: string[],
  tier: Tier,
  advancementId: string,
): string[] {
  const key = slotKey(tier, advancementId);
  return disabled.includes(key) ? disabled : [...disabled, key];
}

function applySubclassUpgrade(char: Character, tier: Tier): Character {
  const cls = classes.find((c) => c.id === char.classId);
  const subclass = cls?.subclasses.find((s) => s.id === char.subclassId);
  if (!subclass) return char;

  let stage = char.subclassStage;
  let newAbilities = [...char.abilities];
  let disabled = [...char.disabledAdvancements];

  if (stage === 'foundation') {
    const feature = subclass.features[0];
    if (feature) {
      newAbilities.push({
        id: crypto.randomUUID(),
        name: `${subclass.name}: Specialization`,
        description: feature,
      });
    }
    stage = 'specialization';
  } else if (stage === 'specialization') {
    const feature = subclass.features[1] ?? subclass.features[0];
    if (feature) {
      newAbilities.push({
        id: crypto.randomUUID(),
        name: `${subclass.name}: Mastery`,
        description: feature,
      });
    }
    stage = 'mastery';
  }

  disabled = disableAdvancement(disabled, tier, 'multiclass');

  return {
    ...char,
    subclassStage: stage,
    abilities: newAbilities,
    disabledAdvancements: disabled,
    advancementSlots: markAdvancementSlot(char.advancementSlots, tier, 'subclass-upgrade'),
  };
}

function applyMulticlass(char: Character, tier: Tier, info: MulticlassInfo): Character {
  const mcClass = classes.find((c) => c.id === info.classId);
  const mcSubclass = mcClass?.subclasses.find((s) => s.id === info.subclassId);
  if (!mcClass || !mcSubclass) return char;

  let disabled = [...char.disabledAdvancements];
  disabled = disableAdvancement(disabled, tier, 'subclass-upgrade');
  disabled = disableAdvancement(disabled, tier, 'multiclass');
  for (let t = 1; t <= 3; t++) {
    disabled = disableAdvancement(disabled, t as Tier, 'multiclass');
  }

  const newAbilities = [
    ...char.abilities,
    ...mcClass.classFeatures.map((f) => ({
      id: f.id,
      name: `${mcClass.name}: ${f.name}`,
      description: f.description,
    })),
  ];

  if (mcSubclass.features[0]) {
    newAbilities.push({
      id: crypto.randomUUID(),
      name: `${mcSubclass.name} (Multiclass)`,
      description: mcSubclass.features[0],
    });
  }

  return {
    ...char,
    multiclass: info,
    abilities: newAbilities,
    disabledAdvancements: disabled,
    advancementSlots: markAdvancementSlot(char.advancementSlots, tier, 'multiclass'),
  };
}

function applyDomainCard(char: Character, cardId: string): Character {
  const catalog = domainCardsCatalog.find((c) => c.id === cardId);
  if (!catalog || char.domainCards.some((c) => c.id === cardId)) return char;
  const card: DomainCard = {
    id: catalog.id,
    domainId: catalog.domain,
    level: catalog.level,
    name: catalog.name,
    description: catalog.description,
    type: catalog.type,
    recallCost: catalog.recallCost,
  };
  return { ...char, domainCards: [...char.domainCards, card] };
}

function applyChoice(char: Character, choice: LevelUpChoice): Character {
  const { advancementId, tier, data } = choice;
  let updated = { ...char };

  switch (advancementId) {
    case 'trait-increase': {
      const traits = data?.traits;
      if (!traits) break;
      const newTraits = { ...updated.traits };
      newTraits[traits[0]] += 1;
      newTraits[traits[1]] += 1;
      updated = {
        ...updated,
        traits: newTraits,
        markedTraits: [...updated.markedTraits, traits[0], traits[1]],
      };
      break;
    }
    case 'hp-slot': {
      const amount = data?.hpAmount ?? 1;
      updated = {
        ...updated,
        hp: { ...updated.hp, max: updated.hp.max + amount, current: updated.hp.current + amount },
      };
      break;
    }
    case 'stress-slot': {
      const amount = data?.stressAmount ?? 1;
      updated = {
        ...updated,
        stress: { ...updated.stress, max: updated.stress.max + amount },
      };
      break;
    }
    case 'experience-boost': {
      const indices = data?.experienceIndices;
      if (!indices) break;
      const entries = [...updated.experienceEntries];
      entries[indices[0]] = { ...entries[indices[0]], bonus: entries[indices[0]].bonus + 1 };
      entries[indices[1]] = { ...entries[indices[1]], bonus: entries[indices[1]].bonus + 1 };
      updated = { ...updated, experienceEntries: entries };
      break;
    }
    case 'domain-card': {
      if (data?.domainCardId) {
        updated = applyDomainCard(updated, data.domainCardId);
      }
      break;
    }
    case 'evasion':
      updated = { ...updated, evasion: updated.evasion + 1 };
      break;
    case 'subclass-upgrade':
      updated = applySubclassUpgrade(updated, tier);
      return updated;
    case 'proficiency': {
      let slots = markAdvancementSlot(updated.advancementSlots, tier, 'proficiency');
      slots = markAdvancementSlot(slots, tier, 'proficiency');
      updated = {
        ...updated,
        proficiency: updated.proficiency + 1,
        weaponDamage: incrementWeaponDamage(updated.weaponDamage),
        advancementSlots: slots,
      };
      return updated;
    }
    case 'multiclass': {
      if (data?.multiclass) {
        updated = applyMulticlass(updated, tier, data.multiclass);
      }
      return updated;
    }
    case 'thresholds':
      updated = { ...updated, thresholdBonus: updated.thresholdBonus + 1 };
      break;
  }

  if (advancementId !== 'subclass-upgrade' && advancementId !== 'proficiency' && advancementId !== 'multiclass') {
    updated = {
      ...updated,
      advancementSlots: markAdvancementSlot(updated.advancementSlots, tier, advancementId),
    };
  }

  return updated;
}

export function applyMilestoneBenefits(
  char: Character,
  newLevel: number,
  newExperienceName?: string,
): Character {
  if (!isMilestoneLevel(newLevel)) return char;

  let updated = { ...char, proficiency: char.proficiency + 1 };

  if (newExperienceName?.trim()) {
    const entry: ExperienceEntry = { name: newExperienceName.trim(), bonus: 2 };
    updated = {
      ...updated,
      experienceEntries: [...updated.experienceEntries, entry],
    };
  }

  if (newLevel === 5 || newLevel === 8) {
    updated = { ...updated, markedTraits: [] };
  }

  return updated;
}

export function previewLevelUpChoices(char: Character, choices: LevelUpChoice[]): Character {
  let updated = { ...char };
  for (const choice of choices) {
    updated = applyChoice(updated, choice);
  }
  return updated;
}

export function validateLevelUpChoices(
  char: Character,
  newLevel: number,
  choices: LevelUpChoice[],
): string | null {
  const totalPicks = choices.reduce((sum, c) => {
    const def = getAdvancementDef(c.advancementId);
    return sum + (def?.pickCost ?? 1);
  }, 0);

  if (totalPicks !== 2) {
    return 'You must spend exactly 2 advancement picks.';
  }

  const tier = getTierForLevel(newLevel);
  let simulated = { ...char };

  for (const choice of choices) {
    const def = getAdvancementDef(choice.advancementId);
    if (!def) return `Unknown advancement: ${choice.advancementId}`;
    if (choice.tier > tier) return `${def.name} is not available at this tier.`;
    if (isAdvancementDisabled(simulated, choice.tier, choice.advancementId)) {
      return `${def.name} is no longer available.`;
    }
    if (!hasAvailableSlot(simulated, choice.tier, choice.advancementId)) {
      return `No remaining slots for ${def.name}.`;
    }

    if (choice.advancementId === 'trait-increase') {
      const traits = choice.data?.traits;
      if (!traits || traits[0] === traits[1]) return 'Choose two different traits.';
      if (simulated.markedTraits.includes(traits[0]) || simulated.markedTraits.includes(traits[1])) {
        return 'Chosen traits must be unmarked.';
      }
    }
    if (choice.advancementId === 'experience-boost') {
      const indices = choice.data?.experienceIndices;
      if (!indices || indices[0] === indices[1]) return 'Choose two different experiences.';
      if (updatedExperienceCount(simulated) < 2) return 'Need at least two experiences.';
    }
    if (choice.advancementId === 'domain-card') {
      if (!choice.data?.domainCardId) return 'Select a domain card.';
      const options = getDomainCardOptions(simulated, newLevel);
      if (!options.some((c) => c.id === choice.data!.domainCardId)) return 'Invalid domain card choice.';
    }
    if (choice.advancementId === 'multiclass') {
      if (!choice.data?.multiclass) return 'Complete multiclass selection.';
    }

    simulated = applyChoice(simulated, choice);
  }

  return null;
}

function updatedExperienceCount(char: Character): number {
  return char.experienceEntries.filter((e) => e.name.trim()).length;
}

export function completeLevelUp(
  char: Character,
  choices: LevelUpChoice[],
  newExperienceName?: string,
): Character {
  const newLevel = char.pendingLevelUp?.targetLevel ?? char.level + 1;

  if (isMilestoneLevel(newLevel) && !newExperienceName?.trim()) {
    throw new Error('Name your new Experience before completing level up.');
  }

  const error = validateLevelUpChoices(char, newLevel, choices);
  if (error) throw new Error(error);

  let updated = { ...char, level: newLevel };

  updated = applyMilestoneBenefits(updated, newLevel, newExperienceName);

  for (const choice of choices) {
    updated = applyChoice(updated, choice);
  }

  const armorStats = computeArmorStats(updated.armorId ?? 'none', newLevel);
  updated = {
    ...updated,
    damageThresholds: {
      major: armorStats.damageThresholds.major + updated.thresholdBonus,
      severe: armorStats.damageThresholds.severe + updated.thresholdBonus,
    },
    armorSlots: { ...updated.armorSlots, max: armorStats.armorSlots.max },
    armorScore: armorStats.armorScore,
    pendingLevelUp: undefined,
    updatedAt: Date.now(),
  };

  return updated;
}

export function getMilestoneSummary(level: number): string[] {
  const lines: string[] = [];
  if (!isMilestoneLevel(level)) return lines;
  lines.push('Gain a new Experience at +2');
  lines.push('Permanently increase Proficiency by 1');
  if (level === 5 || level === 8) {
    lines.push('Clear any marked traits');
  }
  lines.push('Choose two advancements from your tier or below');
  return lines;
}

export function getUnmarkedTraits(char: Character): TraitId[] {
  const all: TraitId[] = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'];
  return all.filter((t) => !char.markedTraits.includes(t));
}

export { ADVANCEMENTS, MILESTONE_LEVELS };
