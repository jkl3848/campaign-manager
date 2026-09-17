import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLoreNotes } from '../hooks/useLoreNotes';
import { getCampaign } from '../services/campaignService';
import { getPlayerSession } from '../lib/playerSession';
import { plainTextPreview } from '../lib/lore';
import type { Campaign } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoreWikiShell } from '../components/lore/LoreWikiShell';

export function LorePage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const playerSession = getPlayerSession();
  const isDm = !!(user && campaign?.dmId === user.uid);
  const isPlayer = !!playerSession && playerSession.campaignId === campaignId;
  const { notes, loading } = useLoreNotes(campaignId, isDm);

  useEffect(() => {
    if (!campaignId) return;
    getCampaign(campaignId).then(setCampaign);
  }, [campaignId]);

  if (!campaignId) return null;

  return (
    <LoreWikiShell campaignId={campaignId} notes={notes} isDm={isDm}>
      {({ query, subjectFilter, filtered, grouped }) => (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">World Lore</h1>
              <p className="text-sm text-slate-400 mt-1">
                {subjectFilter
                  ? `Subject: ${subjectFilter}`
                  : 'Browse by subject in the sidebar, or search titles and content.'}
                {query ? ` · Matching “${query}”` : ''}
              </p>
            </div>
            {isDm && (
              <Link to={`/campaign/${campaignId}/lore/new`}>
                <Button>Create Note</Button>
              </Link>
            )}
          </div>

          {loading || !campaign ? (
            <Card><p className="text-slate-400">Loading…</p></Card>
          ) : notes.length === 0 ? (
            <Card>
              <p className="text-slate-400">
                {isDm ? 'No lore notes yet. Create one to start the wiki.' : 'No shared lore notes yet.'}
              </p>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <p className="text-slate-400">No notes match your search.</p>
            </Card>
          ) : (
            <div className="space-y-8">
              {grouped.map(([subject, subjectNotes]) => (
                <section key={subject} className="space-y-3">
                  <h2 className="text-lg font-semibold text-amber-400/90 border-b border-slate-800 pb-2">
                    {subject}
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      {subjectNotes.length}
                    </span>
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {subjectNotes.map((note) => (
                      <Link
                        key={note.id}
                        to={`/campaign/${campaignId}/lore/${note.id}`}
                      >
                        <Card className="hover:border-amber-500/50 transition-colors cursor-pointer h-full">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-slate-100">{note.title}</h3>
                            {isDm && (
                              <span
                                className={`shrink-0 text-xs px-2 py-0.5 rounded ${
                                  note.playerVisible
                                    ? 'text-sky-400 bg-sky-900/30'
                                    : 'text-slate-400 bg-slate-700/50'
                                }`}
                              >
                                {note.playerVisible ? 'Visible' : 'Private'}
                              </span>
                            )}
                          </div>
                          {note.body && (
                            <p className="text-sm text-slate-400 line-clamp-2 mt-2">
                              {plainTextPreview(note.body)}
                            </p>
                          )}
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {campaign && !isDm && !isPlayer && (
            <p className="text-sm text-slate-500">Join this campaign to view shared lore.</p>
          )}
        </div>
      )}
    </LoreWikiShell>
  );
}
