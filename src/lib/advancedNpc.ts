import type { Character, Npc } from '../types';

export const ADVANCED_NPC_PLAYER_ID = 'dm-npc';

export function isAdvancedNpc(npc: Npc): npc is Npc & { sheet: Character } {
  return !!npc.sheet;
}

export type NpcFromSheetBase = Partial<
  Pick<
    Npc,
    | 'id'
    | 'campaignId'
    | 'inParty'
    | 'playerVisible'
    | 'status'
    | 'notes'
    | 'createdAt'
    | 'abilities'
  >
>;

/**
 * Build or update an Npc from a full character sheet.
 * Top-level NPC fields are mirrored from the sheet so list/panel views keep working.
 * Party membership lives on the Npc (`inParty`), not on the embedded sheet.
 */
export function npcFromSheet(sheet: Character, base: NpcFromSheetBase = {}): Npc {
  const id = base.id ?? sheet.id;
  const campaignId = base.campaignId ?? sheet.campaignId;
  const now = Date.now();

  const normalizedSheet: Character = {
    ...sheet,
    id,
    campaignId,
    playerId: ADVANCED_NPC_PLAYER_ID,
    playerName: 'NPC',
    // Party state lives on the Npc document.
    inParty: false,
    updatedAt: now,
  };

  return {
    id,
    campaignId,
    name: normalizedSheet.name,
    imageUrl: normalizedSheet.imageUrl,
    description: normalizedSheet.description,
    hp: { ...normalizedSheet.hp },
    stress: { ...normalizedSheet.stress },
    evasion: normalizedSheet.evasion,
    traits: { ...normalizedSheet.traits },
    abilities: base.abilities ?? normalizedSheet.abilities ?? [],
    inParty: base.inParty ?? false,
    playerVisible: base.playerVisible ?? false,
    status: base.status,
    notes: base.notes ?? normalizedSheet.notes,
    sheet: normalizedSheet,
    createdAt: base.createdAt ?? normalizedSheet.createdAt ?? now,
    updatedAt: now,
  };
}
