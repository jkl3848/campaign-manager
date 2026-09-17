import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { LoreNote } from '../../types';
import { filterLoreNotes, groupLoreBySubject } from '../../lib/lore';
import { Button } from '../ui/Button';

export interface LoreWikiFilterCtx {
  query: string;
  subjectFilter: string | null;
  filtered: LoreNote[];
  grouped: [string, LoreNote[]][];
}

interface LoreWikiShellProps {
  campaignId: string;
  notes: LoreNote[];
  isDm: boolean;
  activeNoteId?: string;
  children: ReactNode | ((ctx: LoreWikiFilterCtx) => ReactNode);
}

export function LoreWikiShell({
  campaignId,
  notes,
  isDm,
  activeNoteId,
  children,
}: LoreWikiShellProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const query = searchParams.get('q') ?? '';
  const subjectFilter = searchParams.get('subject');

  const setQuery = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value.trim()) next.set('q', value);
      else next.delete('q');
      return next;
    }, { replace: true });
  };

  const setSubjectFilter = (value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('subject', value);
      else next.delete('subject');
      return next;
    }, { replace: true });
  };

  const filtered = useMemo(
    () => filterLoreNotes(notes, query, subjectFilter),
    [notes, query, subjectFilter],
  );
  const grouped = useMemo(() => groupLoreBySubject(filtered), [filtered]);
  const subjects = useMemo(
    () => [...new Set(notes.map((n) => n.subject.trim() || 'Uncategorized'))].sort((a, b) => a.localeCompare(b)),
    [notes],
  );

  const ctx: LoreWikiFilterCtx = { query, subjectFilter, filtered, grouped };

  const sidebar = (
    <aside className="flex h-full flex-col gap-4">
      <div className="space-y-2">
        <Link
          to={`/campaign/${campaignId}/lore`}
          className="text-lg font-semibold text-amber-400 hover:text-amber-300"
          onClick={() => setNavOpen(false)}
        >
          Lore Wiki
        </Link>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes…"
          className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
        />
        {isDm && (
          <Link to={`/campaign/${campaignId}/lore/new`} onClick={() => setNavOpen(false)}>
            <Button size="sm" className="w-full mt-1">New note</Button>
          </Link>
        )}
      </div>

      {subjects.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Subjects</p>
          <div className="flex flex-wrap gap-1.5">
            <SubjectChip
              label="All"
              active={subjectFilter === null}
              onClick={() => setSubjectFilter(null)}
            />
            {subjects.map((s) => (
              <SubjectChip
                key={s}
                label={s}
                active={subjectFilter === s}
                onClick={() => setSubjectFilter(subjectFilter === s ? null : s)}
              />
            ))}
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto space-y-4 pr-1">
        {grouped.length === 0 ? (
          <p className="text-sm text-slate-500">
            {notes.length === 0 ? 'No notes yet.' : 'No matching notes.'}
          </p>
        ) : (
          grouped.map(([subject, subjectNotes]) => (
            <div key={subject}>
              <button
                type="button"
                onClick={() => setSubjectFilter(subject)}
                className="mb-1.5 w-full text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-amber-400"
              >
                {subject}
              </button>
              <ul className="space-y-0.5">
                {subjectNotes.map((note) => {
                  const active = note.id === activeNoteId;
                  return (
                    <li key={note.id}>
                      <Link
                        to={`/campaign/${campaignId}/lore/${note.id}`}
                        onClick={() => setNavOpen(false)}
                        className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                          active
                            ? 'bg-amber-900/40 text-amber-200'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                        }`}
                      >
                        <span className="line-clamp-1">{note.title}</span>
                        {isDm && !note.playerVisible && (
                          <span className="ml-1 text-[10px] text-slate-500">private</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>
    </aside>
  );

  return (
    <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 min-h-[60vh]">
      <div className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-hidden border-r border-slate-800 pr-4">
        {sidebar}
      </div>

      <div className="lg:hidden mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setNavOpen((o) => !o)}>
            {navOpen ? 'Hide index' : 'Browse / Search'}
          </Button>
          {subjectFilter && (
            <button
              type="button"
              onClick={() => setSubjectFilter(null)}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              Clear filter: {subjectFilter}
            </button>
          )}
        </div>
        {navOpen && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 max-h-[50vh] overflow-y-auto">
            {sidebar}
          </div>
        )}
      </div>

      <div className="min-w-0">
        {typeof children === 'function' ? children(ctx) : children}
      </div>
    </div>
  );
}

function SubjectChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
        active
          ? 'bg-amber-700/50 text-amber-100'
          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
}
