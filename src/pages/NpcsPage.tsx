import { Link, useParams } from 'react-router-dom';
import { useCampaignData } from '../hooks/useCampaignData';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function NpcsPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { npcs } = useCampaignData(campaignId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">NPCs</h1>
        <Link to={`/campaign/${campaignId}/npcs/new`}>
          <Button>Create NPC</Button>
        </Link>
      </div>

      {npcs.length === 0 ? (
        <Card><p className="text-slate-400">No NPCs yet.</p></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {npcs.map((n) => (
            <Link key={n.id} to={`/campaign/${campaignId}/npcs/${n.id}`}>
              <Card className="hover:border-amber-500/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  {n.imageUrl && (
                    <img src={n.imageUrl} alt={n.name} className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-100">{n.name}</h3>
                    {n.inParty && <span className="text-xs text-sky-400">In Party</span>}
                    {n.description && <p className="text-sm text-slate-400 line-clamp-1">{n.description}</p>}
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
