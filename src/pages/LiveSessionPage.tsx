import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  subscribeSession,
  updateSession,
  logDiceRoll,
  subscribeDiceLog,
  uploadImage,
  getCampaign,
  saveCharacter,
  saveNpc,
} from '../services/campaignService';
import { getPlayerSession } from '../lib/playerSession';
import { createDiceRoll } from '../lib/dice';
import { clampFear, clampHope, partyHopeTotal, SESSION_FEAR_MAX } from '../lib/hopeFear';
import { useCampaignData } from '../hooks/useCampaignData';
import type { Session, DiceRoll, Combatant, Campaign, Character, Npc } from '../types';
import { SessionCanvas } from '../components/session/SessionCanvas';
import { DmSessionPanel } from '../components/session/DmSessionPanel';
import { PartyPanel, type PartySelection } from '../components/session/PartyPanel';
import { DiceRoller } from '../components/dice/DiceRoller';
import { DiceLog } from '../components/dice/DiceLog';
import { RollAlert } from '../components/dice/RollAlert';
import { CornerDialog } from '../components/ui/CornerDialog';
import { Popup } from '../components/ui/Popup';
import { Textarea } from '../components/ui/Textarea';
import { useLoreNotes } from '../hooks/useLoreNotes';
import { SessionLoreBrowser } from '../components/session/SessionLoreBrowser';

type ActivePopup = 'dice' | 'log' | 'notes' | 'lore' | null;

export function LiveSessionPage() {
  const { campaignId, sessionId } = useParams<{ campaignId: string; sessionId: string }>();
  const { user } = useAuth();
  const playerSession = getPlayerSession();
  const [session, setSession] = useState<Session | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [diceRolls, setDiceRolls] = useState<DiceRoll[]>([]);
  const [activePopup, setActivePopup] = useState<ActivePopup>(null);
  const [alertRoll, setAlertRoll] = useState<DiceRoll | null>(null);
  const seenRollIds = useRef(new Set<string>());
  const diceLogInitialized = useRef(false);
  const { characters, enemies, npcs, encounters } = useCampaignData(campaignId);
  const [partySelection, setPartySelection] = useState<PartySelection>(null);

  const isDm = !!(user && campaign?.dmId === user.uid);
  const { notes: loreNotes } = useLoreNotes(campaignId, isDm);
  const rollerName = isDm ? 'DM' : (playerSession?.playerName ?? 'Player');
  const selectedCharacter =
    partySelection?.kind === 'character'
      ? characters.find((c) => c.id === partySelection.id)
      : undefined;
  const partyHope = partyHopeTotal(characters);
  const diceRollerCharacter = isDm
    ? undefined
    : selectedCharacter && selectedCharacter.playerId === playerSession?.playerId
      ? selectedCharacter
      : characters.find((c) => c.inParty !== false && c.playerId === playerSession?.playerId)
        ?? characters.find((c) => c.playerId === playerSession?.playerId);

  useEffect(() => {
    if (campaignId) getCampaign(campaignId).then(setCampaign);
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId || !sessionId) return;
    return subscribeSession(campaignId, sessionId, setSession);
  }, [campaignId, sessionId]);

  useEffect(() => {
    if (!campaignId || !sessionId) return;
    return subscribeDiceLog(campaignId, sessionId, setDiceRolls);
  }, [campaignId, sessionId]);

  useEffect(() => {
    if (!campaignId || !sessionId || !session) return;
    if (session.fear <= SESSION_FEAR_MAX) return;
    void updateSession(campaignId, sessionId, { fear: SESSION_FEAR_MAX });
  }, [campaignId, sessionId, session]);

  const dismissAlert = useCallback(() => setAlertRoll(null), []);

  useEffect(() => {
    if (diceRolls.length === 0) return;

    if (!diceLogInitialized.current) {
      diceRolls.forEach((r) => seenRollIds.current.add(r.id));
      diceLogInitialized.current = true;
      return;
    }

    const newest = diceRolls[0];
    if (seenRollIds.current.has(newest.id)) return;
    seenRollIds.current.add(newest.id);

    if (!newest.secret || isDm) {
      setAlertRoll(newest);
    }
  }, [diceRolls, isDm]);

  const update = async (data: Partial<Session>) => {
    if (!campaignId || !sessionId) return;
    await updateSession(campaignId, sessionId, data);
  };

  const handleRoll = async (roll: DiceRoll) => {
    if (!campaignId || !sessionId || !session) return;
    await logDiceRoll(campaignId, sessionId, roll);

    if (roll.hopeGain === 'player' && roll.characterId) {
      const character = characters.find((c) => c.id === roll.characterId);
      if (character) {
        const nextHope = clampHope(character.hope + 1);
        if (nextHope !== character.hope) {
          await saveCharacter(campaignId, { ...character, hope: nextHope, updatedAt: Date.now() });
        }
      }
    } else if (roll.hopeGain === 'dm') {
      const nextFear = clampFear(session.fear + 1);
      if (nextFear !== session.fear) {
        await update({ fear: nextFear });
      }
    }
  };

  const handleTraitRoll = (traitName: string, modifier: number) => {
    if (!campaignId || !sessionId || !selectedCharacter) return;
    handleRoll(
      createDiceRoll({
        campaignId,
        sessionId,
        rollerName: `${rollerName} · ${selectedCharacter.name}`,
        modifier,
        label: traitName,
        characterId: selectedCharacter.id,
      }),
    );
  };

  const handleToggleCharacterParty = async (character: Character, inParty: boolean) => {
    if (!campaignId) return;
    await saveCharacter(campaignId, { ...character, inParty, updatedAt: Date.now() });
    if (!inParty && partySelection?.kind === 'character' && partySelection.id === character.id) {
      setPartySelection(null);
    }
  };

  const handleToggleNpcParty = async (npc: Npc, inParty: boolean) => {
    if (!campaignId) return;
    await saveNpc(campaignId, { ...npc, inParty, updatedAt: Date.now() });
    if (!inParty && partySelection?.kind === 'npc' && partySelection.id === npc.id) {
      setPartySelection(null);
    }
  };

  const startCombat = async (encounterId?: string) => {
    if (!session) return;
    const encounter = encounters.find((e) => e.id === encounterId);
    const combatants: Combatant[] = [];

    characters.forEach((c) => {
      combatants.push({
        id: `char-${c.id}`,
        name: c.name,
        type: 'character',
        refId: c.id,
        hp: { ...c.hp },
        stress: { ...c.stress },
        evasion: c.evasion,
        conditions: [],
      });
    });

    if (encounter) {
      for (const encEnemy of encounter.enemies) {
        const enemy = enemies.find((e) => e.id === encEnemy.enemyId);
        if (!enemy) continue;
        for (let i = 0; i < encEnemy.count; i++) {
          combatants.push({
            id: `enemy-${enemy.id}-${i}`,
            name: encEnemy.count > 1 ? `${enemy.name} ${i + 1}` : enemy.name,
            type: 'enemy',
            refId: enemy.id,
            hp: { current: enemy.hp.max, max: enemy.hp.max },
            stress: { current: 0, max: enemy.stress.max },
            evasion: enemy.evasion,
            conditions: [],
          });
        }
      }
    }

    await update({ combatActive: true, combatants, round: 1 });
  };

  const endCombat = () => update({ combatActive: false, combatants: [], round: 0 });

  const adjustCombatant = (id: string, field: 'hp' | 'stress', delta: number) => {
    if (!session) return;
    const combatants = session.combatants.map((c) => {
      if (c.id !== id) return c;
      const resource = c[field];
      return {
        ...c,
        [field]: {
          ...resource,
          current: Math.max(0, Math.min(resource.max, resource.current + delta)),
        },
      };
    });
    update({ combatants });
  };

  if (!session) {
    return (
      <div className="flex h-[calc(100vh-57px)] items-center justify-center">
        <p className="text-slate-400">Loading session...</p>
      </div>
    );
  }

  const dmPanelWidth = isDm ? '18rem' : '0px';

  return (
    <div
      className="relative h-[calc(100vh-57px)] overflow-hidden"
      style={{ '--dm-panel-width': dmPanelWidth } as React.CSSProperties}
    >
      <SessionCanvas
        elements={session.canvasElements}
        mapImageUrl={session.mapImageUrl}
        onElementsChange={(elements) => update({ canvasElements: elements })}
        onMapUpload={
          isDm
            ? async (file) => {
                const url = await uploadImage(campaignId!, file, `sessions/${sessionId}/map.jpg`);
                await update({ mapImageUrl: url });
              }
            : undefined
        }
        readOnly={!isDm && !playerSession}
        fullscreen
      />

      {/* Top center overlay — session title & hope/fear */}
      <div className="pointer-events-none absolute top-3 left-1/2 z-30 -translate-x-1/2">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-950/85 px-4 py-2 backdrop-blur-md">
          <h1 className="font-serif text-sm font-bold text-amber-100">{session.name}</h1>
          <div className="h-4 w-px bg-slate-700" />
          <HopeFearTracker
            label="Hope"
            value={partyHope}
            color="sky"
          />
          <HopeFearTracker
            label="Fear"
            value={clampFear(session.fear)}
            max={SESSION_FEAR_MAX}
            color="purple"
            onAdjust={isDm ? (d) => update({ fear: clampFear(session.fear + d) }) : undefined}
          />
        </div>
      </div>

      {/* DM left panel */}
      {isDm && (
        <DmSessionPanel
          enemies={enemies}
          npcs={npcs}
          encounters={encounters}
          session={session}
          onStartCombat={startCombat}
          onEndCombat={endCombat}
          onNextRound={() => update({ round: session.round + 1 })}
          onAdjustCombatant={adjustCombatant}
        />
      )}

      {/* Party panel — right side */}
      <PartyPanel
        characters={characters}
        npcs={npcs}
        isDm={!!isDm}
        playerId={playerSession?.playerId}
        selection={partySelection}
        onSelect={setPartySelection}
        onToggleCharacterParty={handleToggleCharacterParty}
        onToggleNpcParty={handleToggleNpcParty}
        onSaveCharacter={(c) => saveCharacter(campaignId!, c)}
        onSaveNpc={(n) => saveNpc(campaignId!, n)}
        onTraitRoll={handleTraitRoll}
      />

      {/* Floating action buttons */}
      <div
        className="absolute bottom-4 z-30 flex flex-col gap-2"
        style={{ left: isDm ? 'calc(18rem + 12px)' : '12px' }}
      >
        <ToolbarButton
          label="Roll Dice"
          icon="⚀"
          active={activePopup === 'dice'}
          onClick={() => setActivePopup(activePopup === 'dice' ? null : 'dice')}
        />
        <ToolbarButton
          label="Roll Log"
          icon="☰"
          active={activePopup === 'log'}
          onClick={() => setActivePopup(activePopup === 'log' ? null : 'log')}
          badge={diceRolls.length > 0 ? diceRolls.length : undefined}
        />
        <ToolbarButton
          label="Lore Wiki"
          icon="◈"
          active={activePopup === 'lore'}
          onClick={() => setActivePopup(activePopup === 'lore' ? null : 'lore')}
        />
        {isDm && (
          <ToolbarButton
            label="Session Notes"
            icon="✎"
            active={activePopup === 'notes'}
            onClick={() => setActivePopup(activePopup === 'notes' ? null : 'notes')}
          />
        )}
      </div>

      {/* Session-wide roll alert */}
      <RollAlert roll={alertRoll} onDismiss={dismissAlert} />

      {/* Corner dice roller — no backdrop */}
      <CornerDialog
        open={activePopup === 'dice'}
        onClose={() => setActivePopup(null)}
        title="Dice Roller"
        style={{
          left: isDm ? 'calc(18rem + 12px)' : '12px',
          bottom: 'calc(2.5rem + 3.5rem)',
        }}
      >
        <DiceRoller
          rollerName={
            diceRollerCharacter ? `${rollerName} · ${diceRollerCharacter.name}` : rollerName
          }
          campaignId={campaignId!}
          sessionId={sessionId!}
          onRoll={handleRoll}
          isDm={!!isDm}
          characterId={diceRollerCharacter?.id}
        />
      </CornerDialog>

      <Popup open={activePopup === 'log'} onClose={() => setActivePopup(null)} title="Roll Log" size="lg">
        <DiceLog rolls={diceRolls} isDm={!!isDm} />
      </Popup>

      <Popup open={activePopup === 'lore'} onClose={() => setActivePopup(null)} title="Lore Wiki" size="xl">
        <SessionLoreBrowser notes={loreNotes} isDm={isDm} />
      </Popup>

      {isDm && (
        <Popup open={activePopup === 'notes'} onClose={() => setActivePopup(null)} title="Session Notes" size="lg">
          <Textarea
            value={session.notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Session notes..."
            className="min-h-48"
          />
        </Popup>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  icon,
  active,
  onClick,
  badge,
}: {
  label: string;
  icon: string;
  active?: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition-all ${
        active
          ? 'border-amber-500/60 bg-amber-900/40 text-amber-200 shadow-lg shadow-amber-900/30'
          : 'border-slate-700/60 bg-slate-950/85 text-slate-300 backdrop-blur-md hover:border-slate-500 hover:text-amber-200'
      }`}
    >
      {icon}
      {badge !== undefined && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

function HopeFearTracker({
  label,
  value,
  max,
  color,
  onAdjust,
}: {
  label: string;
  value: number;
  max?: number;
  color: 'sky' | 'purple';
  onAdjust?: (delta: number) => void;
}) {
  const colors = { sky: 'text-sky-400', purple: 'text-purple-400' };
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      {onAdjust && (
        <button
          onClick={() => onAdjust(-1)}
          disabled={value <= 0}
          className="text-slate-600 hover:text-slate-300 text-xs disabled:opacity-30 disabled:hover:text-slate-600"
        >
          −
        </button>
      )}
      <span className={`text-lg font-bold ${colors[color]}`}>
        {max != null ? `${value}/${max}` : value}
      </span>
      {onAdjust && (
        <button
          onClick={() => onAdjust(1)}
          disabled={max != null && value >= max}
          className="text-slate-600 hover:text-slate-300 text-xs disabled:opacity-30 disabled:hover:text-slate-600"
        >
          +
        </button>
      )}
    </div>
  );
}
