import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ADVANCED_NPC_PLAYER_ID, npcFromSheet } from '../lib/advancedNpc';
import { initiateLevelUp } from '../lib/levelUp';
import { getCampaign, saveNpc, uploadImage } from '../services/campaignService';
import type { Campaign, Character } from '../types';
import { CharacterCreator } from '../components/character/CharacterCreator';
import { LevelUpWizard } from '../components/character/LevelUpWizard';
import { Button } from '../components/ui/Button';

type Phase = 'create' | 'leveling' | 'saving';

export function AdvancedNpcCreatePage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [phase, setPhase] = useState<Phase>('create');
  const [sheet, setSheet] = useState<Character | null>(null);
  const [targetLevel, setTargetLevel] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (campaignId) getCampaign(campaignId).then(setCampaign);
  }, [campaignId]);

  if (!campaignId) return null;

  if (!campaign) {
    return <p className="font-serif text-slate-400">Loading…</p>;
  }

  const isDm = !!(user && campaign.dmId === user.uid);
  if (!isDm) {
    return <p className="font-serif text-slate-400">Only the DM can create advanced NPCs.</p>;
  }

  const finishAndSave = async (finalSheet: Character) => {
    setSaving(true);
    setError('');
    setPhase('saving');
    try {
      const npc = npcFromSheet(finalSheet, {
        campaignId,
        inParty: false,
        playerVisible: false,
        createdAt: finalSheet.createdAt,
      });
      await saveNpc(campaignId, npc);
      navigate(`/campaign/${campaignId}/npcs/${npc.id}`);
    } catch (err) {
      console.error(err);
      setError('Could not save this NPC. Check your connection and try again.');
      setSheet(finalSheet);
      setPhase(finalSheet.level < targetLevel ? 'leveling' : 'create');
      setSaving(false);
    }
  };

  const handleCreatorSave = async (character: Character, options?: { targetLevel?: number }) => {
    const level = Math.min(10, Math.max(1, options?.targetLevel ?? 1));
    const withNpcOwner: Character = {
      ...character,
      playerId: ADVANCED_NPC_PLAYER_ID,
      playerName: 'NPC',
      inParty: false,
    };

    if (level <= 1) {
      await finishAndSave(withNpcOwner);
      return;
    }

    setTargetLevel(level);
    setSheet(initiateLevelUp(withNpcOwner));
    setPhase('leveling');
  };

  const handleLevelUpComplete = async (updated: Character) => {
    if (updated.level >= targetLevel) {
      await finishAndSave(updated);
      return;
    }
    setSheet(initiateLevelUp(updated));
  };

  const handleLevelUpCancel = () => {
    if (
      !window.confirm(
        'Cancel advanced NPC creation? Progress through the character creator and level-ups will be discarded.',
      )
    ) {
      return;
    }
    setSheet(null);
    setTargetLevel(1);
    setPhase('create');
    setError('');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-sm tracking-[0.22em] uppercase text-brass">
            Advanced NPC
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-wide text-amber-100">
            {phase === 'leveling'
              ? `Leveling to ${sheet?.pendingLevelUp?.targetLevel ?? sheet?.level ?? 1} of ${targetLevel}`
              : phase === 'saving'
                ? 'Saving…'
                : 'Create Advanced NPC'}
          </h1>
          <p className="mt-1 font-serif text-sm text-slate-400">
            Full character creator stats, background, and abilities — managed as an NPC in the party.
          </p>
        </div>
        <Link to={`/campaign/${campaignId}/npcs`}>
          <Button variant="secondary">Back to NPCs</Button>
        </Link>
      </div>

      {error && (
        <p className="font-serif text-sm text-oxblood" role="alert">
          {error}
        </p>
      )}

      {phase === 'create' && (
        <CharacterCreator
          campaignId={campaignId}
          playerId={ADVANCED_NPC_PLAYER_ID}
          variant="npc"
          onSave={handleCreatorSave}
          onUploadImage={(file) =>
            uploadImage(campaignId, file, `npcs/${crypto.randomUUID()}.jpg`)
          }
        />
      )}

      {phase === 'leveling' && sheet?.pendingLevelUp && (
        <LevelUpWizard
          key={sheet.pendingLevelUp.targetLevel}
          character={sheet}
          onComplete={handleLevelUpComplete}
          onCancel={handleLevelUpCancel}
        />
      )}

      {phase === 'saving' && saving && (
        <p className="font-serif text-slate-400">Saving advanced NPC…</p>
      )}
    </div>
  );
}
