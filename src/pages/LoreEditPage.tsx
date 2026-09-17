import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { saveLoreNote, deleteLoreNote, getCampaign } from '../services/campaignService';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useLoreNotes } from '../hooks/useLoreNotes';
import type { Campaign, LoreNote } from '../types';
import { LoreEditor } from '../components/lore/LoreEditor';

export function LoreEditPage() {
  const { campaignId, noteId } = useParams<{ campaignId: string; noteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const isDm = !!(user && campaign?.dmId === user.uid);
  const isNew = noteId === 'new';
  const [note, setNote] = useState<LoreNote | undefined>();
  const [loadError, setLoadError] = useState(false);
  const { notes } = useLoreNotes(campaignId, isDm);

  useEffect(() => {
    if (!campaignId) return;
    getCampaign(campaignId).then(setCampaign);
  }, [campaignId]);

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100 mb-6">
        {isNew ? 'Create Lore Note' : isDm ? `Edit ${note?.title ?? 'Note'}` : note?.title ?? 'Lore'}
      </h1>
      {!isNew && loadError ? (
        <p className="text-slate-400">Note not found or not shared with players.</p>
      ) : !isNew && !note ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <LoreEditor
          campaignId={campaignId}
          existingSubjects={existingSubjects}
          existing={note}
          readOnly={!isDm}
          onSave={
            isDm
              ? async (n) => {
                  await saveLoreNote(campaignId, n);
                  navigate(`/campaign/${campaignId}/lore`);
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
  );
}
