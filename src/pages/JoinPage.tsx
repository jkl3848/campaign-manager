import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { getCampaignByInviteCode } from '../services/campaignService';
import { setPlayerSession, generatePlayerId } from '../lib/playerSession';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function JoinPage() {
  const [searchParams] = useSearchParams();
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') ?? '');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) setInviteCode(code);
  }, [searchParams]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const campaign = await getCampaignByInviteCode(inviteCode.trim());
      if (!campaign) {
        setError('Invalid invite code. Check with your DM.');
        return;
      }
      const playerId = generatePlayerId();
      setPlayerSession({ playerId, playerName: playerName.trim(), campaignId: campaign.id });
      navigate(`/campaign/${campaign.id}/characters`);
    } catch {
      setError('Failed to join campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <Card title="Join a Campaign">
        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            label="Invite Code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="From your DM's link"
            required
          />
          <Input
            label="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Character player name"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Joining...' : 'Join Campaign'}
          </Button>
        </form>
        <Link to="/" className="block mt-4 text-sm text-slate-500 hover:text-slate-300 text-center">
          Back to home
        </Link>
      </Card>
    </div>
  );
}
