import type { RosterStatus } from '../../types';
import { rosterStatusLabel } from '../../lib/rosterStatus';

export function RosterStatusBadge({ status }: { status: RosterStatus }) {
  if (status === 'active') return null;

  const styles =
    status === 'deceased'
      ? 'text-red-300/90 bg-red-950/40 border-red-900/50'
      : 'text-slate-400 bg-slate-800/60 border-slate-600/50';

  return (
    <span
      className={`inline-block shrink-0 rounded border px-2 py-0.5 font-display text-[10px] uppercase tracking-wider ${styles}`}
    >
      {rosterStatusLabel(status)}
    </span>
  );
}
