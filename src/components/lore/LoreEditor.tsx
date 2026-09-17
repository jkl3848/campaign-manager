import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import type { LoreNote } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';

interface LoreEditorProps {
  campaignId: string;
  existingSubjects: string[];
  existing?: LoreNote;
  readOnly?: boolean;
  onSave?: (note: LoreNote) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function LoreEditor({
  campaignId,
  existingSubjects,
  existing,
  readOnly = false,
  onSave,
  onDelete,
}: LoreEditorProps) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [subject, setSubject] = useState(existing?.subject ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [playerVisible, setPlayerVisible] = useState(existing?.playerVisible ?? false);
  const [mode, setMode] = useState<'edit' | 'preview'>(readOnly ? 'preview' : 'edit');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setSubject(existing.subject);
    setBody(existing.body);
    setPlayerVisible(existing.playerVisible);
  }, [existing]);

  const handleSave = async () => {
    if (!onSave || !title.trim() || !subject.trim()) return;
    setSaving(true);
    const note: LoreNote = {
      id: existing?.id ?? crypto.randomUUID(),
      campaignId,
      title: title.trim(),
      subject: subject.trim(),
      body,
      playerVisible,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    await onSave(note);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!onDelete || !existing) return;
    if (!window.confirm('Delete this lore note?')) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  if (readOnly) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div>
          <p className="text-sm text-slate-400">{existing?.subject}</p>
          <h2 className="text-xl font-semibold text-slate-100 mt-1">{existing?.title}</h2>
        </div>
        <Card>
          <MarkdownPreview source={existing?.body ?? ''} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Card title="Note">
        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="lore-subject" className="text-sm font-medium text-slate-300">
              Subject
            </label>
            <input
              id="lore-subject"
              list="lore-subjects"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Locations, Factions"
              className="rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
            <datalist id="lore-subjects">
              {existingSubjects.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={playerVisible}
              onChange={(e) => setPlayerVisible(e.target.checked)}
              className="rounded"
            />
            Visible to players
          </label>
        </div>
      </Card>

      <Card
        title="Body"
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === 'edit' ? 'primary' : 'secondary'}
              onClick={() => setMode('edit')}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant={mode === 'preview' ? 'primary' : 'secondary'}
              onClick={() => setMode('preview')}
            >
              Preview
            </Button>
          </div>
        }
      >
        {mode === 'edit' ? (
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write markdown…"
            className="min-h-[280px] font-mono text-sm"
          />
        ) : (
          <MarkdownPreview source={body} />
        )}
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving || !title.trim() || !subject.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {existing && onDelete && (
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        )}
      </div>
    </div>
  );
}

function MarkdownPreview({ source }: { source: string }) {
  if (!source.trim()) {
    return <p className="text-slate-500 text-sm">Nothing to preview.</p>;
  }

  return (
    <div className="lore-markdown text-slate-200 text-sm leading-relaxed space-y-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-100 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-100 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-100 [&_p]:text-slate-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-slate-300 [&_a]:text-amber-400 [&_a]:underline [&_code]:rounded [&_code]:bg-slate-900 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-amber-200 [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_blockquote]:border-l-2 [&_blockquote]:border-amber-600/60 [&_blockquote]:pl-3 [&_blockquote]:text-slate-400 [&_strong]:text-slate-100">
      <Markdown>{source}</Markdown>
    </div>
  );
}
