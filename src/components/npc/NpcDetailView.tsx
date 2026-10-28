import type { Npc } from '../../types';
import { rosterStatus } from '../../lib/rosterStatus';
import { RosterStatusBadge } from '../ui/RosterStatusBadge';
import { Card } from '../ui/Card';

interface NpcDetailViewProps {
  npc: Npc;
}

export function NpcDetailView({ npc }: NpcDetailViewProps) {
  return (
    <div className="max-w-2xl space-y-4">
      <Card title={npc.name}>
        {rosterStatus(npc) !== 'active' && (
          <div className="mb-3">
            <RosterStatusBadge status={rosterStatus(npc)} />
          </div>
        )}
        <div className="flex flex-col gap-4 sm:flex-row">
          {npc.imageUrl && (
            <img
              src={npc.imageUrl}
              alt={npc.name}
              className="h-40 w-32 shrink-0 rounded-lg object-cover bg-slate-900"
            />
          )}
          <div className="space-y-3 min-w-0 flex-1">
            {npc.description && (
              <p className="font-serif text-slate-300 whitespace-pre-wrap">{npc.description}</p>
            )}
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-slate-400">HP</dt>
                <dd className="text-slate-200">
                  {npc.hp.current}/{npc.hp.max}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Stress</dt>
                <dd className="text-slate-200">
                  {npc.stress.current}/{npc.stress.max}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Evasion</dt>
                <dd className="text-slate-200">{npc.evasion}</dd>
              </div>
            </dl>
            {npc.inParty && (
              <p className="text-xs text-sky-400 font-display tracking-wide uppercase">In the party</p>
            )}
          </div>
        </div>
      </Card>

      {npc.abilities.length > 0 && (
        <Card title="Abilities">
          <ul className="space-y-3">
            {npc.abilities.map((a, i) => (
              <li key={i} className="rounded-lg bg-slate-900/50 p-3">
                <p className="font-semibold text-slate-100">{a.name}</p>
                {a.description && (
                  <p className="mt-1 text-sm text-slate-400 whitespace-pre-wrap">{a.description}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
