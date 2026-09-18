import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-16 text-center">
      <div>
        <p className="font-display text-sm tracking-[0.28em] uppercase text-brass">Tabletop Campaigns</p>
        <h1 className="mt-2 font-display text-5xl font-semibold tracking-wide text-amber-100">
          Daggerheart Campaign Manager
        </h1>
        <p className="mx-auto mt-4 max-w-lg font-serif text-lg text-slate-400">
          Character sheets, domain cards, and live sessions — built to feel like paper on the table.
        </p>
      </div>

      <div className="grid gap-4 text-left">
        {user ? (
          <Card>
            <p className="mb-4 font-serif text-slate-300">Welcome back, DM. Manage your campaigns or create a new one.</p>
            <Link to="/dm">
              <Button size="lg" className="w-full">Go to DM Dashboard</Button>
            </Link>
          </Card>
        ) : (
          <Card>
            <p className="mb-4 font-serif text-slate-300">Login as the Dungeon Master to create and manage campaigns.</p>
            <Link to="/login">
              <Button size="lg" className="w-full">DM Login</Button>
            </Link>
          </Card>
        )}

        <Card>
          <p className="mb-4 font-serif text-slate-300">Have an invite link from your DM? Join their campaign here.</p>
          <Link to="/join">
            <Button variant="secondary" size="lg" className="w-full">Join Campaign</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
