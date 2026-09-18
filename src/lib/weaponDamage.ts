import type { WeaponDamage } from '../types';

/** Format structured weapon damage as e.g. "d8", "2d10+3", "d6-1". */
export function formatWeaponDamage(damage: WeaponDamage): string {
  const base = damage.count <= 1 ? `d${damage.dice}` : `${damage.count}d${damage.dice}`;
  if (!damage.modifier) return base;
  return damage.modifier > 0 ? `${base}+${damage.modifier}` : `${base}${damage.modifier}`;
}

/** Parse legacy string damage ("d8", "2d10+3") or pass through structured damage. */
export function normalizeWeaponDamage(
  damage: WeaponDamage | string | undefined | null,
): WeaponDamage | undefined {
  if (damage == null) return undefined;
  if (typeof damage === 'object') {
    return {
      dice: damage.dice,
      count: damage.count ?? 1,
      modifier: damage.modifier ?? 0,
    };
  }
  const match = damage.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!match) return undefined;
  return {
    count: match[1] ? parseInt(match[1], 10) : 1,
    dice: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  };
}
