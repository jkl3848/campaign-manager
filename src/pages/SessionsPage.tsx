import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCampaignData } from '../hooks/useCampaignData';
import { getPlayerSession } from '../lib/playerSession';
import {
  archiveOtherActiveSessions,
  endSession,
  getCampaign,
  resolveCampaignFear,
  saveSession,
  subscribeCampaign,
} from '../services/campaignService';
import { clampFear, partyHopeTotal, SESSION_FEAR_MAX } from '../lib/hopeFear';
import type { Campaign, Session } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export function SessionsPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { user } = useAuth();
  const playerSession = getPlayerSession();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const { sessions, characters } = useCampaignData(campaignId);
  const partyHope = partyHopeTotal(characters);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);

  const isDm = !!(user && campaign?.dmId === user.uid);
  const isPlayer = !!playerSession && playerSession.campaignId === campaignId;

  useEffect(() => {
    if (!campaignId) return;
    return subscribeCampaign(campaignId, setCampaign);
  }, [campaignId]);

  const handleCreate = async () => {
    if (!campaignId || !name.trim() || !isDm) return;
    setCreating(true);
    try {
      const fear = await resolveCampaignFear(campaignId, campaign ?? (await getCampaign(campaignId)));
      await archiveOtherActiveSessions(campaignId);
      const session: Session = {
        id: crypto.randomUUID(),
        campaignId,
        name: name.trim(),
        active: true,
        combatActive: false,
        combatants: [],
        round: 0,
        hope: 0,
        fear,
        canvasElements: [],
        notes: '',
        joinedCharacterIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveSession(campaignId, session);
      setName('');
      navigate(`/campaign/${campaignId}/session/${session.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleEnd = async (sessionId: string) => {
    if (!campaignId || !isDm) return;
    if (!confirm('End this session? It will stay viewable as an archive.')) return;
    setEndingId(sessionId);
    try {
      await endSession(campaignId, sessionId);
    } finally {
      setEndingId(null);
    }
  };

  if (!campaignId) return null;

  if (!isDm && !isPlayer) {
    return <p className="font-serif text-slate-400">Join this campaign to view sessions.</p>;
  }

  const sortedSessions = [...sessions].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Sessions</h1>
        {!isDm && (
          <p className="text-sm text-slate-400 mt-1">Join live when your DM starts a session.</p>
        )}
      </div>

      {isDm && (
        <Card title="Start New Session">
          <div className="flex gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Session name (e.g. Session 5 — The Dark Woods)"
              className="flex-1"
            />
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              Start
            </Button>
          </div>
          {sessions.some((s) => s.active) && (
            <p className="mt-2 text-xs text-slate-400">
              Starting a new session ends any currently active session. Fear carries over.
            </p>
          )}
        </Card>
      )}

      {sortedSessions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedSessions.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-100 truncate">{s.name}</h3>
                  <p className="text-sm text-slate-400">
                    {s.active ? 'Active' : 'Ended'} · Hope {partyHope} · Fear{' '}
                    {clampFear(s.active && typeof campaign?.fear === 'number' ? campaign.fear : s.fear)}/
                    {SESSION_FEAR_MAX}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isDm && s.active && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={endingId === s.id}
                      onClick={() => handleEnd(s.id)}
                    >
                      End
                    </Button>
                  )}
                  <Link to={`/campaign/${campaignId}/session/${s.id}`}>
                    <Button size="sm">{s.active ? 'Join' : 'View'}</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-slate-400">
            {isDm ? 'No sessions yet.' : 'No sessions yet. Check back when play begins.'}
          </p>
        </Card>
      )}
    </div>
  );
}
