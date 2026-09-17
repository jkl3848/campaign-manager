import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { saveLoreNote, deleteLoreNote, getCampaign } from '../services/campaignService';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useLoreNotes } from '../hooks/useLoreNotes';
import type { Campaign, LoreNote } from '../types';
import { LoreEditor } from '../components/lore/LoreEditor';
import { LoreWikiShell } from '../components/lore/LoreWikiShell';
import { Button } from '../components/ui/Button';

export function LoreEditPage() {
  const { campaignId, noteId } = useParams<{ campaignId: string; noteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const isDm = !!(user && campaign?.dmId === user.uid);
  const isNew = noteId === 'new';
  const [note, setNote] = useState<LoreNote | undefined>();
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(isNew);
  const { notes } = useLoreNotes(campaignId, isDm);

  useEffect(() => {
    if (!campaignId) return;
    getCampaign(campaignId).then(setCampaign);
  }, [campaignId]);

  useEffect(() => {
    setEditing(isNew);
  }, [isNew, noteId]);

  useEffect(() => {
    if (isNew || !campaignId || !noteId || !campaign) return;

    return onSnapshot(
      doc(db, 'campaigns', campaignId, 'loreNotes', noteId),
      (snap) => {
        if (!snap.exists()) {
          setLoadError(true);
          setNote(undefined);
          return;
        }
        const data = snap.data() as LoreNote;
        if (!isDm && !data.playerVisible) {
          setLoadError(true);
          setNote(undefined);
          return;
        }
        setNote(data);
        setLoadError(false);
      },
      () => {
        setLoadError(true);
        setNote(undefined);
      },
    );
  }, [campaignId, noteId, isNew, isDm, campaign]);

  if (!campaignId || !noteId) return null;

  if (!campaign) {
    return <p className="text-slate-400">Loading…</p>;
  }

  if (!isDm && isNew) {
    return <p className="text-slate-400">Only the DM can create lore notes.</p>;
  }

  const existingSubjects = [
    ...new Set(notes.map((n) => n.subject.trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  const showEditor = isDm && (isNew || editing);

  return (
    <LoreWikiShell
      campaignId={campaignId}
      notes={notes}
      isDm={isDm}
      activeNoteId={isNew ? undefined : noteId}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link to={`/campaign/${campaignId}/lore`} className="text-slate-400 hover:text-amber-400">
            ← Lore Wiki
          </Link>
          {note && (
            <>
              <span className="text-slate-600">/</span>
              <span className="text-slate-500">{note.subject}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-300">{note.title}</span>
            </>
          )}
          {isDm && !isNew && note && !editing && (
            <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          {isDm && !isNew && editing && (
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEditing(false)}>
              Cancel edit
            </Button>
          )}
        </div>

        {!isNew && loadError ? (
          <p className="text-slate-400">Note not found or not shared with players.</p>
        ) : !isNew && !note ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <LoreEditor
            campaignId={campaignId}
            existingSubjects={existingSubjects}
            notes={notes}
            existing={note}
            readOnly={!showEditor}
            onSave={
              isDm
                ? async (n) => {
                    await saveLoreNote(campaignId, n);
                    setEditing(false);
                    navigate(`/campaign/${campaignId}/lore/${n.id}`);
                  }
                : undefined
            }
            onDelete={
              isDm && note
                ? async () => {
                    await deleteLoreNote(campaignId, note.id);
                    navigate(`/campaign/${campaignId}/lore`);
                  }
                : undefined
            }
          />
        )}
      </div>
    </LoreWikiShell>
  );
}
