import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCampaignData } from '../hooks/useCampaignData';
import { getPlayerSession } from '../lib/playerSession';
import { getCampaign } from '../services/campaignService';
import { useEffect } from 'react';
import type { Campaign } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function CharactersPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { user } = useAuth();
  const playerSession = getPlayerSession();
  const { characters } = useCampaignData(campaignId);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    if (campaignId) getCampaign(campaignId).then(setCampaign);
  }, [campaignId]);

  const isDm = user && campaign?.dmId === user.uid;
  const myCharacters = isDm
    ? characters
    : characters.filter((c) => c.playerId === playerSession?.playerId);

  const canCreate = isDm || (playerSession && playerSession.campaignId === campaignId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-wide text-amber-100">Characters</h1>
        {canCreate && (
          <Link to={`/campaign/${campaignId}/characters/new`}>
            <Button>Create Character</Button>
          </Link>
        )}
      </div>

      {myCharacters.length === 0 ? (
        <Card>
          <p className="font-serif text-slate-400">No characters yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myCharacters.map((c) => (
            <Link key={c.id} to={`/campaign/${campaignId}/characters/${c.id}`}>
              <div className="paper-sheet p-4 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center gap-3">
                  {c.imageUrl ? (
                    <div className="h-16 w-12 shrink-0 rotate-[-1.5deg] bg-parchment p-1 shadow-sm">
                      <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-16 w-12 shrink-0 rotate-[-1.5deg] items-center justify-center border border-ink/20 font-display text-xl text-oxblood/50">
                      {c.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">{c.name}</h3>
                    <p className="font-serif text-sm text-ink-muted">{c.playerName}</p>
                    <p className="mt-1 font-display text-xs tracking-wide text-ink-faint">
                      Lv.{c.level ?? 1} · HP {c.hp.current}/{c.hp.max} · Hope {c.hope}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
