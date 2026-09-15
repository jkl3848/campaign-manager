import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { saveEnemy, uploadImage } from '../services/campaignService';
import { db } from '../lib/firebase';
import type { Enemy } from '../types';
import { EnemyBuilder } from '../components/enemy/EnemyBuilder';

export function EnemyEditPage() {
  const { campaignId, enemyId } = useParams<{ campaignId: string; enemyId: string }>();
  const navigate = useNavigate();
  const isNew = enemyId === 'new';
  const [enemy, setEnemy] = useState<Enemy | undefined>();

  useEffect(() => {
    if (isNew || !campaignId || !enemyId) return;
    return onSnapshot(doc(db, 'campaigns', campaignId, 'enemies', enemyId), (snap) => {
      setEnemy(snap.exists() ? (snap.data() as Enemy) : undefined);
    });
  }, [campaignId, enemyId, isNew]);

  if (!campaignId) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100 mb-6">
        {isNew ? 'Create Enemy' : `Edit ${enemy?.name ?? 'Enemy'}`}
      </h1>
      {(!isNew && !enemy) ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <EnemyBuilder
          campaignId={campaignId}
          existing={enemy}
          onSave={async (e) => {
            await saveEnemy(campaignId, e);
            navigate(`/campaign/${campaignId}/enemies`);
          }}
          onUploadImage={(file) => uploadImage(campaignId, file, `enemies/${crypto.randomUUID()}.jpg`)}
        />
      )}
    </div>
  );
}
