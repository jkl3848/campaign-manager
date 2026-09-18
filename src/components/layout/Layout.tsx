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
    <div className="min-h-screen text-slate-100">
      <nav className="sticky top-0 z-50 border-b border-brass/25 bg-[#1c1510]/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-display text-2xl font-semibold tracking-wide text-amber-200">
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
              <span className="border border-oxblood/50 bg-oxblood/20 px-2 py-0.5 font-display text-xs tracking-widest text-amber-200">
                DM
              </span>
            )}
            {isPlayer && !isDm && (
              <span className="border border-brass/40 bg-black/20 px-2 py-0.5 font-display text-xs tracking-wide text-amber-200">
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
      <main className={isLiveSession ? '' : 'mx-auto max-w-7xl px-4 py-6'}>
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-slate-400 transition-colors hover:text-amber-200"
    >
      {children}
    </Link>
  );
}
