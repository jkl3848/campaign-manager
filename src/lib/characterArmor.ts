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
