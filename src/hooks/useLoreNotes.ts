import { useState, useEffect } from 'react';
import { subscribeLoreNotes } from '../services/campaignService';
import type { LoreNote } from '../types';

export function useLoreNotes(campaignId: string | undefined, isDm: boolean) {
  const [notes, setNotes] = useState<LoreNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeLoreNotes(
      campaignId,
      { playerVisibleOnly: !isDm },
      (next) => {
        setNotes(next);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [campaignId, isDm]);

  return { notes, loading };
}
