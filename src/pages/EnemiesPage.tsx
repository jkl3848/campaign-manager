import { Link, useParams } from 'react-router-dom';
import { useCampaignData } from '../hooks/useCampaignData';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function EnemiesPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { enemies } = useCampaignData(campaignId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Enemies</h1>
        <Link to={`/campaign/${campaignId}/enemies/new`}>
          <Button>Create Enemy</Button>
        </Link>
      </div>

      {enemies.length === 0 ? (
        <Card><p className="text-slate-400">No enemies yet. Create one or load from a template.</p></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {enemies.map((e) => (
            <Card key={e.id} className="relative">
              <Link to={`/campaign/${campaignId}/enemies/${e.id}`} className="block hover:opacity-90">
                <div className="flex items-center gap-3">
                  {e.imageUrl && (
                    <img src={e.imageUrl} alt={e.name} className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-100">{e.name}</h3>
                    <p className="text-sm text-slate-400">
                      Tier {e.tier} · HP {e.hp.max} · Difficulty {e.difficulty}
                    </p>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
