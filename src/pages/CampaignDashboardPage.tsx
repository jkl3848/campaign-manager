import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getCampaign } from '../services/campaignService';
import { useCampaignData } from '../hooks/useCampaignData';
import type { Campaign } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function CampaignDashboardPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const { characters, enemies, npcs, encounters, sessions } = useCampaignData(campaignId);
  const isDm = user && campaign?.dmId === user.uid;

  useEffect(() => {
    if (!campaignId) return;
    getCampaign(campaignId).then(setCampaign);
  }, [campaignId]);

  const copyInviteLink = () => {
    if (!campaign) return;
    const url = `${window.location.origin}/join?code=${campaign.inviteCode}`;
    navigator.clipboard.writeText(url);
  };

  if (!campaign) return <p className="text-slate-400">Loading campaign...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{campaign.name}</h1>
          {isDm && (
            <p className="text-sm text-slate-400 mt-1">
              Invite code: <span className="text-amber-400 font-mono">{campaign.inviteCode}</span>
              <button onClick={copyInviteLink} className="ml-2 text-amber-500 hover:text-amber-400 text-xs">
                Copy link
              </button>
            </p>
          )}
        </div>
        {isDm && (
          <Link to={`/campaign/${campaignId}/sessions/new`}>
            <Button>Start Session</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Characters"
          count={characters.length}
          to={`/campaign/${campaignId}/characters`}
        />
        {isDm && (
          <>
            <DashboardCard title="Enemies" count={enemies.length} to={`/campaign/${campaignId}/enemies`} />
            <DashboardCard title="NPCs" count={npcs.length} to={`/campaign/${campaignId}/npcs`} />
            <DashboardCard title="Encounters" count={encounters.length} to={`/campaign/${campaignId}/encounters`} />
            <DashboardCard title="Sessions" count={sessions.length} to={`/campaign/${campaignId}/sessions`} />
          </>
        )}
      </div>

      {sessions.filter((s) => s.active).length > 0 && (
        <Card title="Active Session">
          {sessions.filter((s) => s.active).map((s) => (
            <Link key={s.id} to={`/campaign/${campaignId}/session/${s.id}`}>
              <Button className="w-full">{s.name} — Join Live</Button>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}

function DashboardCard({ title, count, to }: { title: string; count: number; to: string }) {
  return (
    <Link to={to}>
      <Card className="hover:border-amber-500/50 transition-colors cursor-pointer">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        <p className="text-3xl font-bold text-amber-400 mt-2">{count}</p>
      </Card>
    </Link>
  );
}
