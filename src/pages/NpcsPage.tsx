import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCampaignData } from '../hooks/useCampaignData';
import { getPlayerSession } from '../lib/playerSession';
import { getCampaign, saveNpc } from '../services/campaignService';
import type { Campaign, Npc } from '../types';
import { isAdvancedNpc } from '../lib/advancedNpc';
import { rosterStatus } from '../lib/rosterStatus';
import classes from '../config/daggerheart/classes.json';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { RosterStatusBadge } from '../components/ui/RosterStatusBadge';
import { ExpandableImage } from '../components/ui/ImageLightbox';

export function NpcsPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const playerSession = getPlayerSession();
  const isDm = !!(user && campaign?.dmId === user.uid);
  const isPlayer = !!playerSession && playerSession.campaignId === campaignId;
  const { npcs, loading } = useCampaignData(campaignId, {
    npcsForPlayer: !isDm && isPlayer,
    npcsCodexOnly: !isDm && isPlayer,
  });
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (campaignId) getCampaign(campaignId).then(setCampaign);
  }, [campaignId]);

  const togglePlayerVisible = async (npc: Npc) => {
    if (!campaignId || !isDm) return;
    setTogglingId(npc.id);
    try {
      await saveNpc(campaignId, {
        ...npc,
        playerVisible: !npc.playerVisible,
        updatedAt: Date.now(),
      });
    } finally {
      setTogglingId(null);
    }
  };

  if (!campaignId) return null;

  if (!isDm && !isPlayer) {
    return <p className="font-serif text-slate-400">Join this campaign to view NPCs.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">NPCs</h1>
          <p className="text-sm text-slate-400 mt-1">
            {isDm
              ? 'Toggle which NPCs players can browse in the codex.'
              : 'Characters and allies your party has met.'}
          </p>
        </div>
        {isDm && (
          <div className="flex flex-wrap gap-2">
            <Link to={`/campaign/${campaignId}/npcs/new`}>
              <Button variant="secondary">Create NPC</Button>
            </Link>
            <Link to={`/campaign/${campaignId}/npcs/advanced/new`}>
              <Button>Create Advanced NPC</Button>
            </Link>
          </div>
        )}
      </div>

      {loading || !campaign ? (
        <Card><p className="text-slate-400">Loading…</p></Card>
      ) : npcs.length === 0 ? (
        <Card>
          <p className="text-slate-400">
            {isDm ? 'No NPCs yet.' : 'No NPCs have been shared with the party yet.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {npcs.map((n) => (
            <Card key={n.id} className="h-full">
              <div className="flex items-start gap-3">
                {n.imageUrl && (
                  <ExpandableImage
                    src={n.imageUrl}
                    alt={n.name}
                    frameClassName="shrink-0 cursor-zoom-in"
                  >
                    <img src={n.imageUrl} alt={n.name} className="w-12 h-12 rounded-lg object-cover" />
                  </ExpandableImage>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <Link
                        to={`/campaign/${campaignId}/npcs/${n.id}`}
                        className="font-semibold text-slate-100 hover:text-amber-200 transition-colors truncate"
                      >
                        {n.name}
                      </Link>
                      <RosterStatusBadge status={rosterStatus(n)} />
                    </div>
                    {isDm && (
                      <span
                        className={`shrink-0 text-xs px-2 py-0.5 rounded ${
                          n.playerVisible
                            ? 'text-sky-400 bg-sky-900/30'
                            : 'text-slate-400 bg-slate-700/50'
                        }`}
                      >
                        {n.playerVisible ? 'Visible' : 'Hidden'}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {n.inParty && <span className="text-xs text-sky-400">In Party</span>}
                    {isAdvancedNpc(n) && (
                      <span className="text-xs text-amber-400/90">
                        Advanced · Lv {n.sheet.level}{' '}
                        {classes.find((c) => c.id === n.sheet.classId)?.name ?? ''}
                      </span>
                    )}
                  </div>
                  {n.description && (
                    <p className="text-sm text-slate-400 line-clamp-2 mt-1">{n.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={`/campaign/${campaignId}/npcs/${n.id}`}>
                      <Button size="sm" variant="secondary">
                        {isDm ? 'Edit' : 'View'}
                      </Button>
                    </Link>
                    {isDm && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={togglingId === n.id}
                        onClick={() => togglePlayerVisible(n)}
                      >
                        {togglingId === n.id
                          ? '…'
                          : n.playerVisible
                            ? 'Hide from players'
                            : 'Show to players'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
