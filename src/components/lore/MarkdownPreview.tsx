import Markdown from 'react-markdown';
import { Link } from 'react-router-dom';
import type { Components } from 'react-markdown';
import type { LoreNote } from '../../types';
import { resolveWikiLinks } from '../../lib/lore';

interface MarkdownPreviewProps {
  source: string;
  campaignId?: string;
  notes?: LoreNote[];
  /** When set, [[wiki links]] stay in-panel instead of routing away. */
  onNoteNavigate?: (noteId: string) => void;
}

const markdownClassName =
  'lore-markdown text-slate-200 text-sm leading-relaxed space-y-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-100 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-100 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-100 [&_p]:text-slate-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-slate-300 [&_a]:text-amber-400 [&_a]:underline [&_code]:rounded [&_code]:bg-slate-900 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-amber-200 [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_blockquote]:border-l-2 [&_blockquote]:border-amber-600/60 [&_blockquote]:pl-3 [&_blockquote]:text-slate-400 [&_strong]:text-slate-100';

export function MarkdownPreview({
  source,
  campaignId,
  notes = [],
  onNoteNavigate,
}: MarkdownPreviewProps) {
  if (!source.trim()) {
    return <p className="text-slate-500 text-sm">Nothing to preview.</p>;
  }

  const resolved =
    notes.length > 0 && onNoteNavigate
      ? resolveWikiLinks(source, notes, { panel: true })
      : notes.length > 0 && campaignId
        ? resolveWikiLinks(source, notes, { campaignId })
        : source;

  const components: Components = {
    a: ({ href, children }) => {
      if (href?.startsWith('#lore-') && onNoteNavigate) {
        const noteId = href.slice('#lore-'.length);
        return (
          <button
            type="button"
            onClick={() => onNoteNavigate(noteId)}
            className="text-amber-400 underline hover:text-amber-300"
          >
            {children}
          </button>
        );
      }
      if (href?.startsWith('/')) {
        return (
          <Link to={href} className="text-amber-400 underline hover:text-amber-300">
            {children}
          </Link>
        );
      }
      return (
        <a href={href} target="_blank" rel="noreferrer" className="text-amber-400 underline">
          {children}
        </a>
      );
    },
  };

  return (
    <div className={markdownClassName}>
      <Markdown components={components}>{resolved}</Markdown>
    </div>
  );
}
