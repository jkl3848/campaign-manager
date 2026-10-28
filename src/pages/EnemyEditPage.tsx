import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { saveEnemy, uploadImage, getCampaign, deleteEnemy } from '../services/campaignService';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import type { Campaign, Enemy } from '../types';
import { EnemyBuilder } from '../components/enemy/EnemyBuilder';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';

export function EnemyEditPage() {
  const { campaignId, enemyId } = useParams<{ campaignId: string; enemyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = enemyId === 'new';
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [enemy, setEnemy] = useState<Enemy | undefined>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isDm = !!(user && campaign?.dmId === user.uid);

  useEffect(() => {
    if (campaignId) getCampaign(campaignId).then(setCampaign);
  }, [campaignId]);

  useEffect(() => {
    if (isNew || !campaignId || !enemyId) return;
    return onSnapshot(doc(db, 'campaigns', campaignId, 'enemies', enemyId), (snap) => {
      setEnemy(snap.exists() ? (snap.data() as Enemy) : undefined);
    });
  }, [campaignId, enemyId, isNew]);

  if (!campaignId) return null;

  if (!campaign) {
    return <p className="text-slate-400">Loading…</p>;
  }

  if (!isDm) {
    return <p className="text-slate-400">Only the DM can edit enemies.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100 mb-6">
        {isNew ? 'Create Enemy' : `Edit ${enemy?.name ?? 'Enemy'}`}
      </h1>
      {!isNew && enemy && (
        <div className="mb-6">
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            Delete enemy
          </Button>
          <ConfirmDialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            confirming={deleting}
            title="Delete enemy?"
            message={`Permanently delete “${enemy.name}”? This cannot be undone.`}
            confirmLabel="Delete enemy"
            onConfirm={async () => {
              setDeleting(true);
              try {
                await deleteEnemy(campaignId, enemy.id);
                navigate(`/campaign/${campaignId}/enemies`);
              } finally {
                setDeleting(false);
              }
            }}
          />
        </div>
      )}
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
