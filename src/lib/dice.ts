import type { DiceRoll } from '../types';

export const DIE_SIDES = [4, 6, 8, 10, 12, 20] as const;
export type DieSides = (typeof DIE_SIDES)[number];

export interface RollResult {
  white: number;
  black: number;
  modifier: number;
  total: number;
  isCrit: boolean;
  hopeGain: 'player' | 'dm' | 'none';
}

export function isDualityRoll(roll: Pick<DiceRoll, 'results'>): boolean {
  return !roll.results;
}

export function formatDiceNotation(count: number, sides: number, modifier = 0): string {
  const base = `${count}d${sides}`;
  if (modifier === 0) return base;
  return `${base}${modifier > 0 ? '+' : ''}${modifier}`;
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDaggerheart(
  modifier = 0,
  options: { applyHopeFear?: boolean } = {},
): RollResult {
  const applyHopeFear = options.applyHopeFear ?? true;
  const white = rollDie(12);
  const black = rollDie(12);
  const total = white + black + modifier;
  const isCrit = white === black;

  let hopeGain: RollResult['hopeGain'] = 'none';
  if (applyHopeFear) {
    if (white > black) hopeGain = 'player';
    else if (black > white) hopeGain = 'dm';
  }

  return { white, black, modifier, total, isCrit, hopeGain };
}

export function rollStandard(count: number, sides: number, modifier = 0): {
  results: number[];
  modifier: number;
  total: number;
} {
  const safeCount = Math.max(1, Math.min(99, Math.floor(count) || 1));
  const results = Array.from({ length: safeCount }, () => rollDie(sides));
  const total = results.reduce((sum, n) => sum + n, 0) + modifier;
  return { results, modifier, total };
}

export function createDiceRoll(params: {
  campaignId: string;
  sessionId: string;
  rollerName: string;
  modifier?: number;
  label?: string;
  secret?: boolean;
  /** When true, duality rolls never generate Hope/Fear. */
  isDm?: boolean;
  characterId?: string;
  count?: number;
  sides?: DieSides | number;
}): DiceRoll {
  const modifier = params.modifier ?? 0;
  const count = params.count ?? 2;
  const sides = params.sides ?? 12;
  const isDuality = count === 2 && sides === 12;

  if (isDuality) {
    const result = rollDaggerheart(modifier, { applyHopeFear: !params.isDm });
    return {
      id: crypto.randomUUID(),
      campaignId: params.campaignId,
      sessionId: params.sessionId,
      rollerName: params.rollerName,
      characterId: params.characterId,
      white: result.white,
      black: result.black,
      modifier: result.modifier,
      total: result.total,
      isCrit: result.isCrit,
      hopeGain: result.hopeGain,
      label: params.label,
      secret: params.secret ? true : undefined,
      timestamp: Date.now(),
    };
  }

  const result = rollStandard(count, sides, modifier);
  return {
    id: crypto.randomUUID(),
    campaignId: params.campaignId,
    sessionId: params.sessionId,
    rollerName: params.rollerName,
    characterId: params.characterId,
    white: 0,
    black: 0,
    results: result.results,
    sides,
    count: result.results.length,
    modifier: result.modifier,
    total: result.total,
    isCrit: false,
    hopeGain: 'none',
    label: params.label,
    secret: params.secret ? true : undefined,
    timestamp: Date.now(),
  };
}

export function parseDiceNotation(notation: string): number {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return 0;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const mod = match[3] ? parseInt(match[3], 10) : 0;
  return rollStandard(count, sides, mod).total;
}
