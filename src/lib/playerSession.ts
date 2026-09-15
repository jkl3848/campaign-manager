import type { PlayerSession } from '../types';

const STORAGE_KEY = 'dh_player_session';

export function getPlayerSession(): PlayerSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerSession;
  } catch {
    return null;
  }
}

export function setPlayerSession(session: PlayerSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearPlayerSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function generatePlayerId(): string {
  return `player_${crypto.randomUUID()}`;
}

export function generateInviteCode(): string {
  return crypto.randomUUID().slice(0, 8);
}
