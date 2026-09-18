import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { createCampaign } from '../services/campaignService';
import { db } from '../lib/firebase';
import type { Campaign } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function DmDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const q = query(collection(db, 'campaigns'), where('dmId', '==', user.uid));
      const snap = await getDocs(q);
      setCampaigns(snap.docs.map((d) => d.data() as Campaign));
    };
    load();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    const campaign = await createCampaign(newName.trim(), user.uid);
    setCampaigns([...campaigns, campaign]);
    setNewName('');
    setShowCreate(false);
    setCreating(false);
    navigate(`/campaign/${campaign.id}`);
  };

  if (authLoading) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-wide text-amber-100">Your Campaigns</h1>
        <Button onClick={() => setShowCreate(true)}>New Campaign</Button>
      </div>

      {showCreate && (
        <Card title="Create Campaign">
          <div className="flex gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Campaign name"
              className="flex-1"
            />
            <Button onClick={handleCreate} disabled={creating}>Create</Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {campaigns.length === 0 ? (
        <Card>
          <p className="text-slate-400">No campaigns yet. Create one to get started!</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => (
            <Link key={c.id} to={`/campaign/${c.id}`}>
              <Card className="hover:border-amber-500/50 transition-colors cursor-pointer">
                <h3 className="text-lg font-semibold text-slate-100">{c.name}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Invite code: <span className="text-amber-400 font-mono">{c.inviteCode}</span>
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
