import { Link, Outlet, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getPlayerSession } from '../../lib/playerSession';
import { Button } from '../ui/Button';

export function Layout() {
  const { user, logout } = useAuth();
  const { campaignId } = useParams();
  const location = useLocation();
  const isLiveSession = /\/session\/[^/]+$/.test(location.pathname);
  const playerSession = getPlayerSession();
  const isDm = !!user;
  const isPlayer = !!playerSession && playerSession.campaignId === campaignId;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold text-amber-500 tracking-tight">
              JL Campaign Manager
            </Link>
            {campaignId && (
              <div className="flex gap-4 text-sm">
                {isDm && (
                  <>
                    <NavLink to={`/campaign/${campaignId}`}>Dashboard</NavLink>
                    <NavLink to={`/campaign/${campaignId}/enemies`}>Enemies</NavLink>
                    <NavLink to={`/campaign/${campaignId}/npcs`}>NPCs</NavLink>
                    <NavLink to={`/campaign/${campaignId}/encounters`}>Encounters</NavLink>
                    <NavLink to={`/campaign/${campaignId}/sessions`}>Sessions</NavLink>
                  </>
                )}
                {(isPlayer || isDm) && (
                  <>
                    <NavLink to={`/campaign/${campaignId}/characters`}>Characters</NavLink>
                    <NavLink to={`/campaign/${campaignId}/lore`}>Lore</NavLink>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isDm && (
              <span className="text-xs text-amber-400/80 bg-amber-900/30 px-2 py-1 rounded">DM</span>
            )}
            {isPlayer && !isDm && (
              <span className="text-xs text-sky-400/80 bg-sky-900/30 px-2 py-1 rounded">
                {playerSession.playerName}
              </span>
            )}
            {user ? (
              <Button variant="ghost" size="sm" onClick={() => logout()}>Logout</Button>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="sm">DM Login</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>
      <main className={isLiveSession ? '' : 'max-w-7xl mx-auto px-4 py-6'}>
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-slate-400 hover:text-amber-400 transition-colors"
    >
      {children}
    </Link>
  );
}
