import type { Character } from '../types';

export const CHARACTER_HOPE_MAX = 6;
export const SESSION_FEAR_MAX = 12;

export function clampHope(value: number): number {
  return Math.max(0, Math.min(CHARACTER_HOPE_MAX, value));
}

export function clampFear(value: number): number {
  return Math.max(0, Math.min(SESSION_FEAR_MAX, value));
}

export function isPartyCharacter(character: Character): boolean {
  return character.inParty !== false;
}

export function partyHopeTotal(characters: Character[]): number {
  return characters.filter(isPartyCharacter).reduce((sum, character) => sum + (character.hope ?? 0), 0);
}
