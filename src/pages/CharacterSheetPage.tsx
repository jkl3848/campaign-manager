import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { saveCharacter, uploadImage, getCampaign } from '../services/campaignService';
import { getPlayerSession } from '../lib/playerSession';
import { db } from '../lib/firebase';
import type { Character, Campaign } from '../types';
import { CharacterSheet } from '../components/character/CharacterSheet';

export function CharacterSheetPage() {
  const { campaignId, characterId } = useParams<{ campaignId: string; characterId: string }>();
  const { user } = useAuth();
  const playerSession = getPlayerSession();
  const [character, setCharacter] = useState<Character | null>(null);
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

  if (!character) return <p className="text-slate-400">Loading character...</p>;

  const isDm = user && campaign?.dmId === user.uid;
  const isOwner = playerSession?.playerId === character.playerId;
  const canEdit = isDm || isOwner;

  return (
    <div className="max-w-3xl mx-auto">
      <CharacterSheet
        character={character}
        canEdit={!!canEdit}
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
