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
        <h1 className="text-2xl font-bold text-slate-100">Characters</h1>
        {canCreate && (
          <Link to={`/campaign/${campaignId}/characters/new`}>
            <Button>Create Character</Button>
          </Link>
        )}
      </div>

      {myCharacters.length === 0 ? (
        <Card>
          <p className="text-slate-400">No characters yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myCharacters.map((c) => (
            <Link key={c.id} to={`/campaign/${campaignId}/characters/${c.id}`}>
              <Card className="hover:border-amber-500/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  {c.imageUrl && (
                    <img src={c.imageUrl} alt={c.name} className="w-14 h-14 rounded-lg object-cover" />
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-100">{c.name}</h3>
                    <p className="text-sm text-slate-400">{c.playerName}</p>
                    <p className="text-xs text-slate-500">
                      Lv.{c.level ?? 1} · HP {c.hp.current}/{c.hp.max} · Hope {c.hope}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
