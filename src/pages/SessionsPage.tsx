import { Link, useParams, useNavigate } from 'react-router-dom';
import { useCampaignData } from '../hooks/useCampaignData';
import { saveSession } from '../services/campaignService';
import type { Session } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useState } from 'react';

export function SessionsPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { sessions } = useCampaignData(campaignId);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!campaignId || !name.trim()) return;
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveSession(campaignId, session);
    setCreating(false);
    navigate(`/campaign/${campaignId}/session/${session.id}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Sessions</h1>

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

      {sessions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {sessions.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-100">{s.name}</h3>
                  <p className="text-sm text-slate-400">
                    {s.active ? 'Active' : 'Ended'} · Hope {s.hope} · Fear {s.fear}
                  </p>
                </div>
                <Link to={`/campaign/${campaignId}/session/${s.id}`}>
                  <Button size="sm">{s.active ? 'Join' : 'View'}</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
