import type { Character, Npc, RosterStatus } from '../types';

export function rosterStatus(entity: { status?: RosterStatus }): RosterStatus {
  return entity.status ?? 'active';
}

export function isPlayable(entity: { status?: RosterStatus }): boolean {
  return rosterStatus(entity) === 'active';
}

export function rosterStatusLabel(status: RosterStatus): string {
  switch (status) {
    case 'deceased':
      return 'Deceased';
    case 'retired':
      return 'Retired';
    default:
      return 'Active';
  }
}

export function applyStatusSideEffects<T extends Character | Npc>(
  entity: T,
  status: RosterStatus,
): T {
  if (status === 'active') {
    return { ...entity, status, updatedAt: Date.now() };
  }
  return {
    ...entity,
    status,
    inParty: false,
    updatedAt: Date.now(),
  };
}
