import type { Character, DomainCard, Ability } from '../types';
import { computeArmorStats } from './characterArmor';

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

  let experiences: string[] = c.experiences ?? ['', ''];
  if (experiences.length === 0 || typeof experiences[0] === 'object') {
    const legacy = c.experiences as unknown as { name: string }[];
    experiences = [
      typeof legacy?.[0] === 'object' ? legacy[0]?.name ?? '' : '',
      typeof legacy?.[1] === 'object' ? legacy[1]?.name ?? '' : '',
    ];
  }

  const armorStats = computeArmorStats(armorId, level);

  return {
    ...c,
    level,
    feats: c.feats ?? [],
    domainCards,
    experiences,
    armorId,
    armorSlots: c.armorSlots ?? armorStats.armorSlots,
    damageThresholds: c.damageThresholds ?? armorStats.damageThresholds,
    armorScore: c.armorScore ?? armorStats.armorScore,
  };
}
