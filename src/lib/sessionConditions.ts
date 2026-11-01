import type { Session, SessionCondition } from '../types';

export const SESSION_CONDITIONS: SessionCondition[] = [
  'hidden',
  'restrained',
  'vulnerable',
  'poisoned',
];
export type { SessionCondition };

export const SESSION_CONDITION_LABELS: Record<SessionCondition, string> = {
  hidden: 'Hidden',
  restrained: 'Restrained',
  vulnerable: 'Vulnerable',
  poisoned: 'Poisoned',
};

export type PartyConditionMemberKind = 'character' | 'npc';

export function partyConditionKey(kind: PartyConditionMemberKind, id: string): string {
  return `${kind}:${id}`;
}

export function getSessionConditions(
  session: Session,
  kind: PartyConditionMemberKind,
  id: string,
): SessionCondition[] {
  const key = partyConditionKey(kind, id);
  const raw = session.partyConditions?.[key] ?? [];
  return raw.filter((c): c is SessionCondition =>
    (SESSION_CONDITIONS as readonly string[]).includes(c),
  );
}

/** Returns the full `partyConditions` map after toggling one condition. */
export function toggleSessionConditionMap(
  session: Session,
  kind: PartyConditionMemberKind,
  id: string,
  condition: SessionCondition,
): Record<string, SessionCondition[]> {
  const key = partyConditionKey(kind, id);
  const current = getSessionConditions(session, kind, id);
  const nextList = current.includes(condition)
    ? current.filter((c) => c !== condition)
    : [...current, condition];

  const partyConditions: Record<string, SessionCondition[]> = {
    ...(session.partyConditions ?? {}),
  };
  if (nextList.length === 0) {
    delete partyConditions[key];
  } else {
    partyConditions[key] = nextList;
  }
  return partyConditions;
}
