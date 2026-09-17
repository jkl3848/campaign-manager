import type { LoreNote } from '../types';

export function groupLoreBySubject(notes: LoreNote[]): [string, LoreNote[]][] {
  const map = new Map<string, LoreNote[]>();
  for (const note of notes) {
    const key = note.subject.trim() || 'Uncategorized';
    const list = map.get(key) ?? [];
    list.push(note);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([subject, list]) => [
      subject,
      list.sort((a, b) => a.title.localeCompare(b.title)),
    ]);
}

export function filterLoreNotes(notes: LoreNote[], query: string, subjectFilter: string | null): LoreNote[] {
  const q = query.trim().toLowerCase();
  return notes.filter((note) => {
    if (subjectFilter && note.subject.trim() !== subjectFilter) return false;
    if (!q) return true;
    return (
      note.title.toLowerCase().includes(q) ||
      note.subject.toLowerCase().includes(q) ||
      note.body.toLowerCase().includes(q)
    );
  });
}

export function findLoreNoteByTitle(notes: LoreNote[], title: string): LoreNote | undefined {
  const needle = title.trim().toLowerCase();
  return notes.find((n) => n.title.trim().toLowerCase() === needle);
}

/** Turn [[Note Title]] into markdown links when a matching note exists. */
export function resolveWikiLinks(
  source: string,
  notes: LoreNote[],
  opts: { campaignId: string } | { panel: true },
): string {
  return source.replace(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g, (_match, rawTitle: string, rawLabel?: string) => {
    const title = rawTitle.trim();
    const label = (rawLabel ?? title).trim();
    const note = findLoreNoteByTitle(notes, title);
    if (!note) return label;
    if ('panel' in opts) {
      return `[${label}](#lore-${note.id})`;
    }
    return `[${label}](/campaign/${opts.campaignId}/lore/${note.id})`;
  });
}

export function plainTextPreview(body: string, maxLen = 140): string {
  const text = body.replace(/[#*_`>\-\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trim()}…`;
}
