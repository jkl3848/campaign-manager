import { useState, useEffect, useRef } from 'react';
import type { LoreNote } from '../../types';
import { imageAltFromFilename, insertMarkdownImage } from '../../lib/lore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { MarkdownPreview } from './MarkdownPreview';

interface LoreEditorProps {
  campaignId: string;
  noteId: string;
  existingSubjects: string[];
  notes?: LoreNote[];
  existing?: LoreNote;
  readOnly?: boolean;
  onSave?: (note: LoreNote) => Promise<void>;
  onDelete?: () => Promise<void>;
  onUploadImage?: (file: File) => Promise<string>;
}

export function LoreEditor({
  campaignId,
  noteId,
  existingSubjects,
  notes = [],
  existing,
  readOnly = false,
  onSave,
  onDelete,
  onUploadImage,
}: LoreEditorProps) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [subject, setSubject] = useState(existing?.subject ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [playerVisible, setPlayerVisible] = useState(existing?.playerVisible ?? false);
  const [mode, setMode] = useState<'edit' | 'preview'>(readOnly ? 'preview' : 'edit');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef(body);
  bodyRef.current = body;

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
      id: existing?.id ?? noteId,
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

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUploadImage) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Choose an image file.');
      return;
    }

    const snapshot = bodyRef.current;
    const field = textareaRef.current;
    const start = field?.selectionStart ?? snapshot.length;
    const end = field?.selectionEnd ?? snapshot.length;

    setUploadingImage(true);
    setUploadError(null);
    try {
      const url = await onUploadImage(file);
      const latest = bodyRef.current;
      const inserted =
        latest === snapshot
          ? insertMarkdownImage(latest, start, end, imageAltFromFilename(file.name), url)
          : insertMarkdownImage(latest, latest.length, latest.length, imageAltFromFilename(file.name), url);
      setBody(inserted.body);
      requestAnimationFrame(() => {
        const node = textareaRef.current;
        if (!node) return;
        node.focus();
        node.setSelectionRange(inserted.cursor, inserted.cursor);
      });
    } catch {
      setUploadError('Couldn’t upload that image. Try a smaller photo.');
    } finally {
      setUploadingImage(false);
    }
  };

  if (readOnly) {
    return (
      <article className="space-y-4 max-w-3xl">
        <header>
          <p className="text-sm text-slate-400">{existing?.subject}</p>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{existing?.title}</h1>
        </header>
        <Card>
          <MarkdownPreview
            source={existing?.body ?? ''}
            campaignId={campaignId}
            notes={notes}
          />
        </Card>
      </article>
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
              className="rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
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
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write markdown… Use [[Note Title]] to link other lore pages."
              className="min-h-[280px] font-mono text-sm"
            />
            {onUploadImage && (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFile}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? 'Uploading…' : 'Add image'}
                </Button>
                <p className="text-xs text-slate-400">
                  Images are compressed on upload. Add as many as you need.
                </p>
              </div>
            )}
            {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
            <p className="text-xs text-slate-400">
              Tip: link another note with <code className="text-amber-300/80">[[Exact Title]]</code>
              {' '}or <code className="text-amber-300/80">[[Exact Title|display text]]</code>
            </p>
          </div>
        ) : (
          <MarkdownPreview source={body} campaignId={campaignId} notes={notes} />
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
