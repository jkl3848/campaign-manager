import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { saveNpc, uploadImage } from '../services/campaignService';
import { db } from '../lib/firebase';
import type { Npc } from '../types';
import { NpcBuilder } from '../components/npc/NpcBuilder';

export function NpcEditPage() {
  const { campaignId, npcId } = useParams<{ campaignId: string; npcId: string }>();
  const navigate = useNavigate();
  const isNew = npcId === 'new';
  const [npc, setNpc] = useState<Npc | undefined>();

  useEffect(() => {
    if (isNew || !campaignId || !npcId) return;
    return onSnapshot(doc(db, 'campaigns', campaignId, 'npcs', npcId), (snap) => {
      setNpc(snap.exists() ? (snap.data() as Npc) : undefined);
    });
  }, [campaignId, npcId, isNew]);

  if (!campaignId) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100 mb-6">
        {isNew ? 'Create NPC' : `Edit ${npc?.name ?? 'NPC'}`}
      </h1>
      {(!isNew && !npc) ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <NpcBuilder
          campaignId={campaignId}
          existing={npc}
          onSave={async (n) => {
            await saveNpc(campaignId, n);
            navigate(`/campaign/${campaignId}/npcs`);
          }}
          onUploadImage={(file) => uploadImage(campaignId, file, `npcs/${crypto.randomUUID()}.jpg`)}
        />
      )}
    </div>
  );
}
