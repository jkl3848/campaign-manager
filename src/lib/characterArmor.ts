import equipment from '../config/daggerheart/equipment.json';

export function computeArmorStats(armorId: string, level: number) {
  const armor = equipment.armor.find((a) => a.id === armorId) ?? equipment.armor[0];

  if (armor.id === 'none') {
    return {
      armorScore: 0,
      damageThresholds: { major: level, severe: level * 2 },
      armorSlots: { marked: 0, max: 0 },
    };
  }

  return {
    armorScore: armor.score,
    damageThresholds: {
      major: armor.thresholdMajor + level,
      severe: armor.thresholdSevere + level,
    },
    armorSlots: { marked: 0, max: armor.score },
  };
}

/** Slots granted by the worn armor, before any extra slots. */
export function baseArmorSlotMax(armorSlotsMax: number, extraArmorSlots = 0) {
  return Math.max(0, armorSlotsMax - Math.max(0, extraArmorSlots));
}

/** Stack extra armor slots onto a base slot count and clamp marked slots. */
export function armorSlotsWithExtra(baseMax: number, marked: number, extraArmorSlots: number) {
  const extra = Math.max(0, extraArmorSlots);
  const max = Math.max(0, baseMax) + extra;
  return {
    extraArmorSlots: extra,
    armorSlots: {
      marked: Math.min(Math.max(0, marked), max),
      max,
    },
  };
}
