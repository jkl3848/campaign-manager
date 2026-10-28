import type { Character, Npc, Session } from '../types';

/** Character ids present in this live session's main party. */
export function sessionJoinedCharacterIds(session: Session, characters: Character[]): Set<string> {
  if (session.joinedCharacterIds !== undefined) {
    return new Set(session.joinedCharacterIds);
  }
  return new Set(characters.filter((c) => c.inParty !== false).map((c) => c.id));
}

export function isCharacterInSessionParty(
  session: Session,
  character: Character,
  characters: Character[],
): boolean {
  return sessionJoinedCharacterIds(session, characters).has(character.id);
}

export function rosterNpcVisible(npc: Npc, isDm: boolean): boolean {
  if (isDm) return true;
  return npc.playerVisible === true;
}
