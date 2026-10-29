import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { generateInviteCode } from '../lib/playerSession';
import { compressImage, compressBoardImage } from '../lib/images';
import { stripUndefined } from '../lib/stripUndefined';
import { normalizeEnemy } from '../lib/enemies';
import type { Campaign, Character, Enemy, Npc, Encounter, Session, DiceRoll, LoreNote } from '../types';

export async function createCampaign(name: string, dmId: string, description?: string): Promise<Campaign> {
  const id = crypto.randomUUID();
  const campaign: Campaign = {
    id,
    name,
    ...(description !== undefined ? { description } : {}),
    dmId,
    inviteCode: generateInviteCode(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(doc(db, 'campaigns', id), stripUndefined(campaign));
  return campaign;
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const snap = await getDoc(doc(db, 'campaigns', id));
  return snap.exists() ? (snap.data() as Campaign) : null;
}

export async function getCampaignByInviteCode(code: string): Promise<Campaign | null> {
  const q = query(collection(db, 'campaigns'), where('inviteCode', '==', code));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as Campaign;
}

export async function updateCampaign(id: string, data: Partial<Campaign>): Promise<void> {
  await updateDoc(doc(db, 'campaigns', id), stripUndefined({ ...data, updatedAt: Date.now() }));
}

export function subscribeCampaign(id: string, cb: (c: Campaign | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'campaigns', id), (snap) => {
    cb(snap.exists() ? (snap.data() as Campaign) : null);
  });
}

export async function uploadImage(campaignId: string, file: File, path: string): Promise<string> {
  const compressed = await compressImage(file);
  const storageRef = ref(storage, `campaigns/${campaignId}/${path}`);
  await uploadBytes(storageRef, compressed);
  return getDownloadURL(storageRef);
}

export async function uploadBoardImage(
  campaignId: string,
  sessionId: string,
  file: File,
): Promise<{ url: string; storagePath: string }> {
  const compressed = await compressBoardImage(file);
  const storagePath = `campaigns/${campaignId}/sessions/${sessionId}/board/${crypto.randomUUID()}.webp`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, compressed, { contentType: 'image/webp' });
  const url = await getDownloadURL(storageRef);
  return { url, storagePath };
}

export async function deleteStorageObject(path: string): Promise<void> {
  await deleteObject(ref(storage, path));
}

// Characters
export async function saveCharacter(campaignId: string, character: Character): Promise<void> {
  await setDoc(
    doc(db, 'campaigns', campaignId, 'characters', character.id),
    stripUndefined({ ...character, updatedAt: Date.now() }),
  );
}

export async function deleteCharacter(campaignId: string, characterId: string): Promise<void> {
  await deleteDoc(doc(db, 'campaigns', campaignId, 'characters', characterId));
}

export function subscribeCharacters(campaignId: string, cb: (chars: Character[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'campaigns', campaignId, 'characters'), (snap) => {
    cb(snap.docs.map((d) => d.data() as Character));
  });
}

// Enemies
export async function saveEnemy(campaignId: string, enemy: Enemy): Promise<void> {
  await setDoc(
    doc(db, 'campaigns', campaignId, 'enemies', enemy.id),
    stripUndefined({ ...enemy, updatedAt: Date.now() }),
  );
}

export async function deleteEnemy(campaignId: string, enemyId: string): Promise<void> {
  await deleteDoc(doc(db, 'campaigns', campaignId, 'enemies', enemyId));
}

export function subscribeEnemies(campaignId: string, cb: (enemies: Enemy[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'campaigns', campaignId, 'enemies'), (snap) => {
    cb(snap.docs.map((d) => normalizeEnemy({ id: d.id, ...d.data() })));
  });
}

// NPCs
export async function saveNpc(campaignId: string, npc: Npc): Promise<void> {
  await setDoc(
    doc(db, 'campaigns', campaignId, 'npcs', npc.id),
    stripUndefined({ ...npc, updatedAt: Date.now() }),
  );
}

export async function deleteNpc(campaignId: string, npcId: string): Promise<void> {
  await deleteDoc(doc(db, 'campaigns', campaignId, 'npcs', npcId));
}

export function subscribeNpcs(
  campaignId: string,
  cb: (npcs: Npc[]) => void,
  options?: { forPlayer?: boolean; codexOnly?: boolean },
): Unsubscribe {
  const col = collection(db, 'campaigns', campaignId, 'npcs');

  if (!options?.forPlayer) {
    return onSnapshot(col, (snap) => {
      cb(snap.docs.map((d) => d.data() as Npc));
    });
  }

  if (options.codexOnly) {
    return onSnapshot(query(col, where('playerVisible', '==', true)), (snap) => {
      cb(snap.docs.map((d) => d.data() as Npc));
    });
  }

  let visible: Npc[] = [];
  let inParty: Npc[] = [];

  const emit = () => {
    const byId = new Map<string, Npc>();
    for (const n of [...visible, ...inParty]) byId.set(n.id, n);
    cb([...byId.values()]);
  };

  const unsubVisible = onSnapshot(
    query(col, where('playerVisible', '==', true)),
    (snap) => {
      visible = snap.docs.map((d) => d.data() as Npc);
      emit();
    },
  );
  const unsubParty = onSnapshot(
    query(col, where('inParty', '==', true)),
    (snap) => {
      inParty = snap.docs.map((d) => d.data() as Npc);
      emit();
    },
  );

  return () => {
    unsubVisible();
    unsubParty();
  };
}

// Encounters
export async function saveEncounter(campaignId: string, encounter: Encounter): Promise<void> {
  await setDoc(
    doc(db, 'campaigns', campaignId, 'encounters', encounter.id),
    stripUndefined({ ...encounter, updatedAt: Date.now() }),
  );
}

export async function deleteEncounter(campaignId: string, encounterId: string): Promise<void> {
  await deleteDoc(doc(db, 'campaigns', campaignId, 'encounters', encounterId));
}

export function subscribeEncounters(campaignId: string, cb: (encounters: Encounter[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'campaigns', campaignId, 'encounters'), (snap) => {
    cb(snap.docs.map((d) => d.data() as Encounter));
  });
}

// Sessions
export async function saveSession(campaignId: string, session: Session): Promise<void> {
  await setDoc(
    doc(db, 'campaigns', campaignId, 'sessions', session.id),
    stripUndefined({ ...session, updatedAt: Date.now() }),
  );
}

export async function updateSession(campaignId: string, sessionId: string, data: Partial<Session>): Promise<void> {
  await updateDoc(
    doc(db, 'campaigns', campaignId, 'sessions', sessionId),
    stripUndefined({ ...data, updatedAt: Date.now() }),
  );
}

export function subscribeSession(campaignId: string, sessionId: string, cb: (s: Session | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'campaigns', campaignId, 'sessions', sessionId), (snap) => {
    cb(snap.exists() ? (snap.data() as Session) : null);
  });
}

export function subscribeSessions(campaignId: string, cb: (sessions: Session[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'campaigns', campaignId, 'sessions'), (snap) => {
    cb(snap.docs.map((d) => d.data() as Session));
  });
}

// Lore notes
export async function saveLoreNote(campaignId: string, note: LoreNote): Promise<void> {
  await setDoc(
    doc(db, 'campaigns', campaignId, 'loreNotes', note.id),
    stripUndefined({ ...note, updatedAt: Date.now() }),
  );
}

export async function deleteLoreNote(campaignId: string, noteId: string): Promise<void> {
  await deleteDoc(doc(db, 'campaigns', campaignId, 'loreNotes', noteId));
}

export async function getLoreNote(campaignId: string, noteId: string): Promise<LoreNote | null> {
  const snap = await getDoc(doc(db, 'campaigns', campaignId, 'loreNotes', noteId));
  return snap.exists() ? (snap.data() as LoreNote) : null;
}

export function subscribeLoreNotes(
  campaignId: string,
  options: { playerVisibleOnly?: boolean },
  cb: (notes: LoreNote[]) => void,
): Unsubscribe {
  const col = collection(db, 'campaigns', campaignId, 'loreNotes');
  const q = options.playerVisibleOnly
    ? query(col, where('playerVisible', '==', true))
    : col;
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as LoreNote));
  });
}

// Dice log
export async function logDiceRoll(campaignId: string, _sessionId: string, roll: DiceRoll): Promise<void> {
  await setDoc(doc(db, 'campaigns', campaignId, 'diceLog', roll.id), stripUndefined(roll));
}

export function subscribeDiceLog(campaignId: string, sessionId: string, cb: (rolls: DiceRoll[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'campaigns', campaignId, 'diceLog'),
    where('sessionId', '==', sessionId),
  );
  return onSnapshot(q, (snap) => {
    const rolls = snap.docs.map((d) => d.data() as DiceRoll);
    rolls.sort((a, b) => b.timestamp - a.timestamp);
    cb(rolls);
  });
}
