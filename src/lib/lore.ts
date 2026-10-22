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

/** Alt text for an uploaded file, safe to drop into markdown image syntax. */
export function imageAltFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '');
  const cleaned = base
    .replace(/[[\]\r\n]/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'image';
}

/** Insert `![alt](url)` at a selection, keeping it on its own lines. */
export function insertMarkdownImage(
  body: string,
  start: number,
  end: number,
  alt: string,
  url: string,
): { body: string; cursor: number } {
  const safeAlt = alt.replace(/[[\]\r\n]/g, ' ').replace(/\s+/g, ' ').trim() || 'image';
  const snippet = `![${safeAlt}](${url})`;
  const safeStart = Math.max(0, Math.min(start, body.length));
  const safeEnd = Math.max(safeStart, Math.min(end, body.length));
  const before = body.slice(0, safeStart);
  const after = body.slice(safeEnd);
  const prefix =
    before.length === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const suffix = after.length === 0 ? '\n' : after.startsWith('\n') ? '' : '\n\n';
  const next = `${before}${prefix}${snippet}${suffix}${after}`;
  return { body: next, cursor: before.length + prefix.length + snippet.length };
}

export function firstMarkdownImage(body: string): string | undefined {
  const match = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i.exec(body);
  return match?.[1];
}

function bodyForSearch(body: string): string {
  return body.replace(/!\[([^\]]*)\]\([^)]*\)/g, ' $1 ');
}

export function filterLoreNotes(notes: LoreNote[], query: string, subjectFilter: string | null): LoreNote[] {
  const q = query.trim().toLowerCase();
  return notes.filter((note) => {
    if (subjectFilter && note.subject.trim() !== subjectFilter) return false;
    if (!q) return true;
    return (
      note.title.toLowerCase().includes(q) ||
      note.subject.toLowerCase().includes(q) ||
      bodyForSearch(note.body).toLowerCase().includes(q)
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
  const text = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#*_`>\-\[\]()!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trim()}…`;
}
