import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCampaignData } from '../hooks/useCampaignData';
import { getPlayerSession } from '../lib/playerSession';
import { getCampaign, saveSession } from '../services/campaignService';
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

  const isDm = !!(user && campaign?.dmId === user.uid);
  const isPlayer = !!playerSession && playerSession.campaignId === campaignId;

  useEffect(() => {
    if (campaignId) getCampaign(campaignId).then(setCampaign);
  }, [campaignId]);

  const handleCreate = async () => {
    if (!campaignId || !name.trim() || !isDm) return;
    setCreating(true);
    const session: Session = {
      id: crypto.randomUUID(),
      campaignId,
      name: name.trim(),
      active: true,
      combatActive: false,
      combatants: [],
      round: 0,
      hope: 0,
      fear: 0,
      canvasElements: [],
      notes: '',
      joinedCharacterIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveSession(campaignId, session);
    setCreating(false);
    navigate(`/campaign/${campaignId}/session/${session.id}`);
  };

  if (!campaignId) return null;

  if (!isDm && !isPlayer) {
    return <p className="font-serif text-slate-400">Join this campaign to view sessions.</p>;
  }

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
        </Card>
      )}

      {sessions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {sessions.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-100">{s.name}</h3>
                  <p className="text-sm text-slate-400">
                    {s.active ? 'Active' : 'Ended'} · Hope {partyHope} · Fear {clampFear(s.fear)}/{SESSION_FEAR_MAX}
                  </p>
                </div>
                <Link to={`/campaign/${campaignId}/session/${s.id}`}>
                  <Button size="sm">{s.active ? 'Join' : 'View'}</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-slate-400">{isDm ? 'No sessions yet.' : 'No sessions yet. Check back when play begins.'}</p>
        </Card>
      )}
    </div>
  );
}
