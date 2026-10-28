import { useNavigate, useParams } from 'react-router-dom';
import { saveCharacter, uploadImage } from '../services/campaignService';
import { getPlayerSession, setActiveCharacterId } from '../lib/playerSession';
import { useAuth } from '../hooks/useAuth';
import { CharacterCreator } from '../components/character/CharacterCreator';
import type { Character } from '../types';

export function CharacterCreatePage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const playerSession = getPlayerSession();

  const playerId = playerSession?.playerId ?? (user ? `dm-${user.uid}` : '');

  if (!campaignId || !playerId) {
    return <p className="font-serif text-slate-400">Please join a campaign or login as DM first.</p>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-3 font-display text-sm tracking-[0.22em] uppercase text-brass">Character Creation</p>
      <CharacterCreator
        campaignId={campaignId}
        playerId={playerId}
        defaultPlayerName={user ? 'DM' : ''}
        onSave={async (character: Character) => {
          await saveCharacter(campaignId, character);
          setActiveCharacterId(character.id);
          navigate(`/campaign/${campaignId}/characters/${character.id}`);
        }}
        onUploadImage={(file) => uploadImage(campaignId, file, `characters/${crypto.randomUUID()}.jpg`)}
      />
    </div>
  );
}
