import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import classes from '../config/daggerheart/classes.json';
import { useAuth } from '../hooks/useAuth';
import { useCampaignData } from '../hooks/useCampaignData';
import { getPlayerSession, isDmPlayerId, setActiveCharacterId } from '../lib/playerSession';
import { isPlayable } from '../lib/rosterStatus';
import { getCampaign, saveCharacter } from '../services/campaignService';
import type { Campaign, Character } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function PickCharacterPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const playerSession = getPlayerSession();
  const { characters, loading } = useCampaignData(campaignId);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (campaignId) getCampaign(campaignId).then(setCampaign);
  }, [campaignId]);

  if (!campaignId) {
    return <p className="font-serif text-slate-400">Missing campaign.</p>;
  }

  const isDm = !!(user && campaign?.dmId === user.uid);
  if (isDm) {
    return <Navigate to={`/campaign/${campaignId}/characters`} replace />;
  }

  if (!playerSession || playerSession.campaignId !== campaignId) {
    return <Navigate to="/join" replace />;
  }

  const pickable = characters.filter((c) => !isDmPlayerId(c.playerId) && isPlayable(c));

  const handlePick = async (character: Character) => {
    setError('');
    setClaimingId(character.id);
    try {
      if (character.playerId !== playerSession.playerId) {
        await saveCharacter(campaignId, { ...character, playerId: playerSession.playerId });
      }
      setActiveCharacterId(character.id);
      navigate(`/campaign/${campaignId}/characters/${character.id}`);
    } catch {
      setError('Could not select that character. Try again.');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="font-display text-sm tracking-[0.22em] uppercase text-brass">Welcome</p>
        <h1 className="font-display text-3xl font-semibold tracking-wide text-amber-100">
          Pick your character
        </h1>
        {campaign && (
          <p className="mt-1 font-serif text-slate-400">
            {campaign.name} — choose who you&apos;re playing, or create someone new.
          </p>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading ? (
        <p className="font-serif text-slate-400">Loading characters…</p>
      ) : pickable.length === 0 ? (
        <Card title="No characters yet">
          <p className="font-serif text-slate-400 mb-4">
            This campaign doesn&apos;t have any player characters yet. Create one to get started.
          </p>
          <Link to={`/campaign/${campaignId}/characters/new`}>
            <Button>Create Character</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {pickable.map((c) => (
              <CharacterPickCard
                key={c.id}
                character={c}
                disabled={claimingId !== null}
                loading={claimingId === c.id}
                onPick={() => handlePick(c)}
              />
            ))}
          </div>
          <div className="border-t border-brass/20 pt-4 text-center">
            <Link to={`/campaign/${campaignId}/characters/new`}>
              <Button variant="secondary">Create a new character</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function CharacterPickCard({
  character,
  disabled,
  loading,
  onPick,
}: {
  character: Character;
  disabled: boolean;
  loading: boolean;
  onPick: () => void;
}) {
  const cls = classes.find((c) => c.id === character.classId);

  return (
    <div className="paper-sheet flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        {character.imageUrl ? (
          <div className="h-16 w-12 shrink-0 rotate-[-1.5deg] bg-parchment p-1 shadow-sm">
            <img src={character.imageUrl} alt={character.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-16 w-12 shrink-0 rotate-[-1.5deg] items-center justify-center border border-ink/20 font-display text-xl text-oxblood/50">
            {character.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-semibold text-ink truncate">{character.name}</h3>
          <p className="font-serif text-sm text-ink-muted">{character.playerName}</p>
          <p className="mt-1 font-display text-xs tracking-wide text-ink-faint">
            Lv.{character.level ?? 1} · {cls?.name ?? 'Adventurer'}
          </p>
        </div>
      </div>
      <Button className="w-full" disabled={disabled} onClick={onPick}>
        {loading ? 'Selecting…' : `Play as ${character.name}`}
      </Button>
    </div>
  );
}
