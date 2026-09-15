import { Link, useParams } from 'react-router-dom';
import { useCampaignData } from '../hooks/useCampaignData';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function EncountersPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { encounters } = useCampaignData(campaignId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Encounters</h1>
        <Link to={`/campaign/${campaignId}/encounters/new`}>
          <Button>Create Encounter</Button>
        </Link>
      </div>

      {encounters.length === 0 ? (
        <Card><p className="text-slate-400">No encounters yet. Build one from your enemies.</p></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {encounters.map((enc) => (
            <Link key={enc.id} to={`/campaign/${campaignId}/encounters/${enc.id}`}>
              <Card className="hover:border-amber-500/50 transition-colors cursor-pointer">
                <h3 className="font-semibold text-slate-100">{enc.name}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {enc.enemies.map((e) => `${e.count}× ${e.name}`).join(', ') || 'Empty encounter'}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
