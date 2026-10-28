import { useState, useEffect } from 'react';
import {
  subscribeCharacters,
  subscribeEnemies,
  subscribeNpcs,
  subscribeEncounters,
  subscribeSessions,
} from '../services/campaignService';
import type { Character, Enemy, Npc, Encounter, Session } from '../types';

export function useCampaignData(
  campaignId: string | undefined,
  options?: { npcsForPlayer?: boolean; npcsCodexOnly?: boolean },
) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    const unsubs = [
      subscribeCharacters(campaignId, setCharacters),
      subscribeEnemies(campaignId, setEnemies),
      subscribeNpcs(campaignId, setNpcs, {
        forPlayer: options?.npcsForPlayer,
        codexOnly: options?.npcsCodexOnly,
      }),
      subscribeEncounters(campaignId, setEncounters),
      subscribeSessions(campaignId, setSessions),
    ];

    setLoading(false);
    return () => unsubs.forEach((u) => u());
  }, [campaignId, options?.npcsForPlayer, options?.npcsCodexOnly]);

  return { characters, enemies, npcs, encounters, sessions, loading };
}
