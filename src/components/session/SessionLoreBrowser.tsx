import { useMemo, useState } from 'react';
import type { LoreNote } from '../../types';
import { filterLoreNotes, groupLoreBySubject, plainTextPreview } from '../../lib/lore';
import { Button } from '../ui/Button';
import { MarkdownPreview } from '../lore/MarkdownPreview';

interface SessionLoreBrowserProps {
  notes: LoreNote[];
  isDm: boolean;
}

export function SessionLoreBrowser({ notes, isDm }: SessionLoreBrowserProps) {
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterLoreNotes(notes, query, subjectFilter),
    [notes, query, subjectFilter],
  );
  const grouped = useMemo(() => groupLoreBySubject(filtered), [filtered]);
  const subjects = useMemo(
    () => [...new Set(notes.map((n) => n.subject.trim() || 'Uncategorized'))].sort((a, b) => a.localeCompare(b)),
    [notes],
  );
  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  if (notes.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        {isDm ? 'No lore notes yet.' : 'No shared lore notes yet.'}
      </p>
    );
  }

  if (activeNote) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setActiveNoteId(null)}>
            ← Index
          </Button>
          <span className="text-xs text-slate-500">{activeNote.subject}</span>
          {isDm && !activeNote.playerVisible && (
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Private</span>
          )}
        </div>
        <h2 className="text-xl font-semibold text-slate-100">{activeNote.title}</h2>
        <MarkdownPreview
          source={activeNote.body}
          notes={notes}
          onNoteNavigate={setActiveNoteId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search lore…"
        className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
      />

      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label="All"
            active={subjectFilter === null}
            onClick={() => setSubjectFilter(null)}
          />
          {subjects.map((s) => (
            <FilterChip
              key={s}
              label={s}
              active={subjectFilter === s}
              onClick={() => setSubjectFilter(subjectFilter === s ? null : s)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">No matching notes.</p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([subject, subjectNotes]) => (
            <section key={subject}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {subject}
              </h3>
              <ul className="space-y-1">
                {subjectNotes.map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => setActiveNoteId(note.id)}
                      className="w-full rounded-lg border border-transparent px-3 py-2 text-left hover:border-slate-600 hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-100">{note.title}</span>
                        {isDm && !note.playerVisible && (
                          <span className="text-[10px] text-slate-500">private</span>
                        )}
                      </div>
                      {note.body && (
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                          {plainTextPreview(note.body, 100)}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
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
