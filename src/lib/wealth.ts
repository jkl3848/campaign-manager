import type { Wealth } from '../types';

/** 10 coins = 1 handful, matching the handful / bag / chest steps below. */
const COINS_PER_HANDFUL = 10;
const HANDFULS_PER_BAG = 10;
const BAGS_PER_CHEST = 10;

export const WEALTH_UNITS = [
  { id: 'coins', label: 'Coins', singular: 'coin', plural: 'coins' },
  { id: 'handfuls', label: 'Handfuls', singular: 'handful', plural: 'handfuls' },
  { id: 'bags', label: 'Bags', singular: 'bag', plural: 'bags' },
  { id: 'chests', label: 'Chests', singular: 'chest', plural: 'chests' },
] as const;

export type WealthUnit = (typeof WEALTH_UNITS)[number]['id'];

const UNIT_IN_COINS: Record<WealthUnit, number> = {
  coins: 1,
  handfuls: COINS_PER_HANDFUL,
  bags: COINS_PER_HANDFUL * HANDFULS_PER_BAG,
  chests: COINS_PER_HANDFUL * HANDFULS_PER_BAG * BAGS_PER_CHEST,
};

export const WEALTH_EXCHANGE =
  `${COINS_PER_HANDFUL} coins = 1 handful · ${HANDFULS_PER_BAG} handfuls = 1 bag · ${BAGS_PER_CHEST} bags = 1 chest`;

export function emptyWealth(): Wealth {
  return { coins: 0, handfuls: 0, bags: 0, chests: 0 };
}

function cleanCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function totalCoins(wealth: Wealth): number {
  return (
    wealth.coins * UNIT_IN_COINS.coins +
    wealth.handfuls * UNIT_IN_COINS.handfuls +
    wealth.bags * UNIT_IN_COINS.bags +
    wealth.chests * UNIT_IN_COINS.chests
  );
}

/** Break a coin total into chests, bags, handfuls, and leftover coins. */
export function wealthFromCoins(total: number): Wealth {
  const safe = cleanCount(total);
  const chests = Math.floor(safe / UNIT_IN_COINS.chests);
  const afterChests = safe % UNIT_IN_COINS.chests;
  const bags = Math.floor(afterChests / UNIT_IN_COINS.bags);
  const afterBags = afterChests % UNIT_IN_COINS.bags;
  const handfuls = Math.floor(afterBags / UNIT_IN_COINS.handfuls);
  const coins = afterBags % UNIT_IN_COINS.handfuls;
  return { coins, handfuls, bags, chests };
}

/** Roll any unit that has reached 10 into the next higher tier. */
export function normalizeWealth(input?: Partial<Wealth> | null): Wealth {
  const raw: Wealth = {
    coins: cleanCount(input?.coins),
    handfuls: cleanCount(input?.handfuls),
    bags: cleanCount(input?.bags),
    chests: cleanCount(input?.chests),
  };
  const total = totalCoins(raw);
  if (!Number.isSafeInteger(total)) {
    return wealthFromCoins(Number.MAX_SAFE_INTEGER);
  }
  return wealthFromCoins(total);
}

export type WealthAdjustResult =
  | { ok: true; wealth: Wealth }
  | { ok: false; reason: 'short' | 'invalid' };

/**
 * Add or remove gold in one unit.
 * A negative change breaks higher units when the lower one is short.
 * Returns `short` when the character does not have enough.
 */
export function applyWealthDelta(
  wealth: Wealth | undefined,
  unit: WealthUnit,
  delta: number,
): WealthAdjustResult {
  if (!Number.isInteger(delta) || delta === 0) return { ok: false, reason: 'invalid' };
  const current = totalCoins(normalizeWealth(wealth));
  const change = UNIT_IN_COINS[unit] * delta;
  if (!Number.isSafeInteger(change)) return { ok: false, reason: 'invalid' };
  const next = current + change;
  if (!Number.isSafeInteger(next)) return { ok: false, reason: 'invalid' };
  if (next < 0) return { ok: false, reason: 'short' };
  return { ok: true, wealth: wealthFromCoins(next) };
}

/** "2 bags and 4 handfuls", or "No gold" when every unit is empty. */
export function formatWealth(wealth: Wealth | undefined): string {
  const current = normalizeWealth(wealth);
  const parts = [...WEALTH_UNITS].reverse().flatMap((unit) => {
    const count = current[unit.id];
    if (count <= 0) return [];
    return [`${count} ${count === 1 ? unit.singular : unit.plural}`];
  });
  if (parts.length === 0) return 'No gold';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
