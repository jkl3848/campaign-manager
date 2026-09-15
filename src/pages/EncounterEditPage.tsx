import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { saveEncounter } from '../services/campaignService';
import { useCampaignData } from '../hooks/useCampaignData';
import { db } from '../lib/firebase';
import type { Encounter } from '../types';
import { EncounterBuilder } from '../components/encounter/EncounterBuilder';

export function EncounterEditPage() {
  const { campaignId, encounterId } = useParams<{ campaignId: string; encounterId: string }>();
  const navigate = useNavigate();
  const isNew = encounterId === 'new';
  const { enemies } = useCampaignData(campaignId);
  const [encounter, setEncounter] = useState<Encounter | undefined>();

  useEffect(() => {
    if (isNew || !campaignId || !encounterId) return;
    return onSnapshot(doc(db, 'campaigns', campaignId, 'encounters', encounterId), (snap) => {
      setEncounter(snap.exists() ? (snap.data() as Encounter) : undefined);
    });
  }, [campaignId, encounterId, isNew]);

  if (!campaignId) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100 mb-6">
        {isNew ? 'Create Encounter' : `Edit ${encounter?.name ?? 'Encounter'}`}
      </h1>
      {(!isNew && !encounter) ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <EncounterBuilder
          campaignId={campaignId}
          enemies={enemies}
          existing={encounter}
          onSave={async (e) => {
            await saveEncounter(campaignId, e);
            navigate(`/campaign/${campaignId}/encounters`);
          }}
        />
      )}
    </div>
  );
}
