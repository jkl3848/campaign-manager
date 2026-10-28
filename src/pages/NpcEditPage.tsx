import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { saveNpc, uploadImage, getCampaign, deleteNpc, subscribeCharacters } from '../services/campaignService';
import { applyStatusSideEffects } from '../lib/rosterStatus';
import { isAdvancedNpc, npcFromSheet } from '../lib/advancedNpc';
import type { Character, RosterStatus } from '../types';
import { DmRosterControls } from '../components/dm/DmRosterControls';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { getPlayerSession } from '../lib/playerSession';
import type { Campaign, Npc } from '../types';
import { NpcBuilder } from '../components/npc/NpcBuilder';
import { NpcDetailView } from '../components/npc/NpcDetailView';
import { CharacterSheet } from '../components/character/CharacterSheet';
import { Button } from '../components/ui/Button';

export function NpcEditPage() {
  const { campaignId, npcId } = useParams<{ campaignId: string; npcId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const playerSession = getPlayerSession();
  const isNew = npcId === 'new';
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [npc, setNpc] = useState<Npc | undefined>();
  const [party, setParty] = useState<Character[]>([]);
  const [loadError, setLoadError] = useState(false);

  const isDm = !!(user && campaign?.dmId === user.uid);
  const isPlayer = !!playerSession && playerSession.campaignId === campaignId;

  useEffect(() => {
    if (campaignId) getCampaign(campaignId).then(setCampaign);
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return;
    return subscribeCharacters(campaignId, setParty);
  }, [campaignId]);

  useEffect(() => {
    if (isNew || !campaignId || !npcId || !campaign) return;

    return onSnapshot(
      doc(db, 'campaigns', campaignId, 'npcs', npcId),
      (snap) => {
        if (!snap.exists()) {
          setLoadError(true);
          setNpc(undefined);
          return;
        }
        const data = snap.data() as Npc;
        if (!isDm && !data.playerVisible) {
          setLoadError(true);
          setNpc(undefined);
          return;
        }
        setNpc(data);
        setLoadError(false);
      },
      () => {
        setLoadError(true);
        setNpc(undefined);
      },
    );
  }, [campaignId, npcId, isNew, isDm, campaign]);

  if (!campaignId) return null;

  if (!campaign) {
    return <p className="text-slate-400">Loading…</p>;
  }

  if (!isDm && isNew) {
    return <p className="text-slate-400">Only the DM can create NPCs.</p>;
  }

  if (!isDm && !isPlayer) {
    return <p className="text-slate-400">Join this campaign to view NPCs.</p>;
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="text-slate-400">NPC not found or not shared with players.</p>
        <Link to={`/campaign/${campaignId}/npcs`}>
          <Button variant="secondary">Back to NPCs</Button>
        </Link>
      </div>
    );
  }

  if (!isNew && !npc) {
    return <p className="text-slate-400">Loading...</p>;
  }

  const advanced = npc && isAdvancedNpc(npc);

  if (!isDm && npc && advanced) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Link
          to={`/campaign/${campaignId}/npcs`}
          className="text-sm text-slate-400 hover:text-slate-300"
        >
          ← Back to NPCs
        </Link>
        <CharacterSheet
          character={npc.sheet}
          party={party}
          canEdit={false}
          isDm={false}
          onSave={async () => {}}
        />
      </div>
    );
  }

  if (!isDm && npc) {
    return (
      <div className="space-y-4">
        <Link
          to={`/campaign/${campaignId}/npcs`}
          className="text-sm text-slate-400 hover:text-slate-300"
        >
          ← Back to NPCs
        </Link>
        <NpcDetailView npc={npc} />
      </div>
    );
  }

  if (advanced && npc) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-sm tracking-[0.22em] uppercase text-brass">
              Advanced NPC
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-wide text-amber-100">
              {npc.name}
            </h1>
          </div>
          <Link to={`/campaign/${campaignId}/npcs`}>
            <Button variant="secondary">Back to NPCs</Button>
          </Link>
        </div>
        <DmRosterControls
          entityLabel="NPC"
          name={npc.name}
          status={npc.status}
          onStatusChange={async (next: RosterStatus) => {
            await saveNpc(campaignId, applyStatusSideEffects(npc, next));
          }}
          onDelete={async () => {
            await deleteNpc(campaignId, npc.id);
            navigate(`/campaign/${campaignId}/npcs`);
          }}
        />
        <CharacterSheet
          character={npc.sheet}
          party={party}
          canEdit
          isDm
          onSave={async (s) => {
            await saveNpc(campaignId, npcFromSheet(s, npc));
          }}
          onUploadImage={(file) =>
            uploadImage(campaignId, file, `npcs/${npc.id}.jpg`)
          }
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100 mb-6">
        {isNew ? 'Create NPC' : `Edit ${npc?.name ?? 'NPC'}`}
      </h1>
      {!isNew && npc && (
        <DmRosterControls
          entityLabel="NPC"
          name={npc.name}
          status={npc.status}
          onStatusChange={async (next: RosterStatus) => {
            await saveNpc(campaignId, applyStatusSideEffects(npc, next));
          }}
          onDelete={async () => {
            await deleteNpc(campaignId, npc.id);
            navigate(`/campaign/${campaignId}/npcs`);
          }}
        />
      )}
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
