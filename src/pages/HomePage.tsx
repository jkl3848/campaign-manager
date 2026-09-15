import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
      <div>
        <h1 className="text-4xl font-bold text-amber-500 mb-3">Daggerheart Campaign Manager</h1>
        <p className="text-slate-400 text-lg">
          Track characters, run encounters, and play live sessions together.
        </p>
      </div>

      <div className="grid gap-4">
        {user ? (
          <Card>
            <p className="text-slate-300 mb-4">Welcome back, DM. Manage your campaigns or create a new one.</p>
            <Link to="/dm">
              <Button size="lg" className="w-full">Go to DM Dashboard</Button>
            </Link>
          </Card>
        ) : (
          <Card>
            <p className="text-slate-300 mb-4">Login as the Dungeon Master to create and manage campaigns.</p>
            <Link to="/login">
              <Button size="lg" className="w-full">DM Login</Button>
            </Link>
          </Card>
        )}

        <Card>
          <p className="text-slate-300 mb-4">Have an invite link from your DM? Join their campaign here.</p>
          <Link to="/join">
            <Button variant="secondary" size="lg" className="w-full">Join Campaign</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
