import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import {
  saveCharacter,
  uploadImage,
  getCampaign,
  subscribeCharacters,
  deleteCharacter,
} from '../services/campaignService';
import { getPlayerSession } from '../lib/playerSession';
import { applyStatusSideEffects, isPlayable, rosterStatus } from '../lib/rosterStatus';
import { db } from '../lib/firebase';
import type { Character, Campaign, RosterStatus } from '../types';
import { CharacterSheet } from '../components/character/CharacterSheet';
import { DmRosterControls } from '../components/dm/DmRosterControls';
import { RosterStatusBadge } from '../components/ui/RosterStatusBadge';

export function CharacterSheetPage() {
  const { campaignId, characterId } = useParams<{ campaignId: string; characterId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const playerSession = getPlayerSession();
  const [character, setCharacter] = useState<Character | null>(null);
  const [party, setParty] = useState<Character[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    getCampaign(campaignId).then(setCampaign);
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId || !characterId) return;
    return onSnapshot(doc(db, 'campaigns', campaignId, 'characters', characterId), (snap) => {
      setCharacter(snap.exists() ? (snap.data() as Character) : null);
    });
  }, [campaignId, characterId]);

  useEffect(() => {
    if (!campaignId) return;
    return subscribeCharacters(campaignId, setParty);
  }, [campaignId]);

  if (!character) return <p className="text-slate-400">Loading character...</p>;

  const isDm = !!(user && campaign?.dmId === user.uid);
  const isOwner = playerSession?.playerId === character.playerId;
  const status = rosterStatus(character);
  const canEdit = isDm || (isOwner && isPlayable(character));

  return (
    <div className="mx-auto max-w-5xl">
      {isDm && (
        <DmRosterControls
          entityLabel="character"
          name={character.name}
          status={character.status}
          onStatusChange={async (next: RosterStatus) => {
            await saveCharacter(campaignId!, applyStatusSideEffects(character, next));
          }}
          onDelete={async () => {
            await deleteCharacter(campaignId!, character.id);
            navigate(`/campaign/${campaignId}/characters`);
          }}
        />
      )}
      {!isPlayable(character) && (
        <div className="mb-4 flex items-center gap-2">
          <RosterStatusBadge status={status} />
          {!isDm && (
            <p className="font-serif text-sm text-slate-400">
              This character is not active — sheet is view-only.
            </p>
          )}
        </div>
      )}
      <CharacterSheet
        character={character}
        party={party}
        canEdit={canEdit}
        isDm={isDm}
        onSave={(c) => saveCharacter(campaignId!, c)}
        onUploadImage={
          canEdit
            ? (file) => uploadImage(campaignId!, file, `characters/${characterId}.jpg`)
            : undefined
        }
      />
    </div>
  );
}
