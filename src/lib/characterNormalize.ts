import type { Character, DomainCard, Ability, ExperienceEntry } from '../types';
import { computeArmorStats } from './characterArmor';
import { normalizeWeaponDamage } from './weaponDamage';

/** Migrate legacy fields and fill defaults for characters saved before schema updates. */
export function normalizeCharacter(c: Character): Character {
  const level = c.level ?? 1;
  const armorId = c.armorId ?? 'none';

  const legacy = c as Character & { domainEffects?: Ability[] };
  let domainCards: DomainCard[] = c.domainCards ?? [];
  if (domainCards.length === 0 && legacy.domainEffects?.length) {
    domainCards = legacy.domainEffects.map((e) => ({
      id: e.id ?? crypto.randomUUID(),
      domainId: 'unknown',
      level: 1,
      name: e.name,
      description: e.description,
    }));
  }

  let experienceEntries: ExperienceEntry[] = c.experienceEntries ?? [];
  if (experienceEntries.length === 0) {
    let experiences: string[] = c.experiences ?? ['', ''];
    if (experiences.length === 0 || typeof experiences[0] === 'object') {
      const legacyExp = c.experiences as unknown as { name: string }[];
      experiences = [
        typeof legacyExp?.[0] === 'object' ? legacyExp[0]?.name ?? '' : '',
        typeof legacyExp?.[1] === 'object' ? legacyExp[1]?.name ?? '' : '',
      ];
    }
    experienceEntries = experiences.map((name) => ({ name, bonus: 2 }));
  }

  const armorStats = computeArmorStats(armorId, level);

  return {
    ...c,
    level,
    feats: c.feats ?? [],
    domainCards,
    experienceEntries,
    proficiency: c.proficiency ?? 1,
    thresholdBonus: c.thresholdBonus ?? 0,
    markedTraits: c.markedTraits ?? [],
    advancementSlots: c.advancementSlots ?? {},
    disabledAdvancements: c.disabledAdvancements ?? [],
    subclassStage: c.subclassStage ?? 'foundation',
    multiclass: c.multiclass
      ? { ...c.multiclass, subclassStage: c.multiclass.subclassStage ?? 'foundation' }
      : undefined,
    armorId,
    armorSlots: c.armorSlots ?? armorStats.armorSlots,
    damageThresholds: c.damageThresholds ?? armorStats.damageThresholds,
    armorScore: c.armorScore ?? armorStats.armorScore,
    weaponDamage: normalizeWeaponDamage(
      c.weaponDamage as Character['weaponDamage'] | string | undefined,
    ),
  };
}
