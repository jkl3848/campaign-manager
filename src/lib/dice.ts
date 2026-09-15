export interface RollResult {
  white: number;
  black: number;
  modifier: number;
  total: number;
  isCrit: boolean;
  hopeGain: 'player' | 'dm' | 'none';
}

export function rollDaggerheart(modifier = 0): RollResult {
  const white = Math.floor(Math.random() * 12) + 1;
  const black = Math.floor(Math.random() * 12) + 1;
  const total = white + black + modifier;
  const isCrit = white === black;

  let hopeGain: RollResult['hopeGain'] = 'none';
  if (white > black) hopeGain = 'player';
  else if (black > white) hopeGain = 'dm';

  return { white, black, modifier, total, isCrit, hopeGain };
}

export function parseDiceNotation(notation: string): number {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return 0;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const mod = match[3] ? parseInt(match[3], 10) : 0;
  let sum = mod;
  for (let i = 0; i < count; i++) {
    sum += Math.floor(Math.random() * sides) + 1;
  }
  return sum;
}
