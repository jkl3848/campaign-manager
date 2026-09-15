import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  subscribeSession,
  updateSession,
  logDiceRoll,
  subscribeDiceLog,
  uploadImage,
  getCampaign,
} from '../services/campaignService';
import { getPlayerSession } from '../lib/playerSession';
import { useCampaignData } from '../hooks/useCampaignData';
import type { Session, DiceRoll, Combatant, Campaign } from '../types';
import { SessionCanvas } from '../components/session/SessionCanvas';
import { DiceRoller } from '../components/dice/DiceRoller';
import { DiceLog } from '../components/dice/DiceLog';
import { CharacterSheet } from '../components/character/CharacterSheet';
import { saveCharacter } from '../services/campaignService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';

export function LiveSessionPage() {
  const { campaignId, sessionId } = useParams<{ campaignId: string; sessionId: string }>();
  const { user } = useAuth();
  const playerSession = getPlayerSession();
  const [session, setSession] = useState<Session | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [diceRolls, setDiceRolls] = useState<DiceRoll[]>([]);
  const { characters, enemies, encounters } = useCampaignData(campaignId);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');

  const isDm = user && campaign?.dmId === user.uid;
  const rollerName = isDm ? 'DM' : (playerSession?.playerName ?? 'Player');
  const myCharacters = playerSession
    ? characters.filter((c) => c.playerId === playerSession.playerId)
    : characters;
  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId) ?? myCharacters[0];

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
    if (myCharacters.length > 0 && !selectedCharacterId) {
      setSelectedCharacterId(myCharacters[0].id);
    }
  }, [myCharacters, selectedCharacterId]);

  const update = async (data: Partial<Session>) => {
    if (!campaignId || !sessionId) return;
    await updateSession(campaignId, sessionId, data);
  };

  const handleRoll = async (roll: DiceRoll) => {
    if (!campaignId || !sessionId || !session) return;
    await logDiceRoll(campaignId, sessionId, roll);

    if (roll.hopeGain === 'player') {
      await update({ hope: session.hope + 1 });
    } else if (roll.hopeGain === 'dm') {
      await update({ fear: session.fear + 1 });
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

  if (!session) return <p className="text-slate-400">Loading session...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">{session.name}</h1>
        <div className="flex items-center gap-4">
          <HopeFearTracker label="Hope" value={session.hope} color="sky" onAdjust={isDm ? (d) => update({ hope: Math.max(0, session.hope + d) }) : undefined} />
          <HopeFearTracker label="Fear" value={session.fear} color="purple" onAdjust={isDm ? (d) => update({ fear: Math.max(0, session.fear + d) }) : undefined} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <Card title="Live Canvas">
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
            />
          </Card>

          <Card title="Dice Roller">
            <DiceRoller
              rollerName={rollerName}
              campaignId={campaignId!}
              sessionId={sessionId!}
              onRoll={handleRoll}
            />
          </Card>

          <Card title="Roll Log">
            <DiceLog rolls={diceRolls} />
          </Card>

          {session.combatActive && (
            <Card title={`Combat — Round ${session.round}`}>
              <div className="space-y-2">
                {session.combatants.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg px-4 py-2">
                    <div>
                      <span className="font-medium text-slate-200">{c.name}</span>
                      <span className="text-xs text-slate-500 ml-2">{c.type}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <CombatResource label="HP" current={c.hp.current} max={c.hp.max} onAdjust={isDm ? (d) => adjustCombatant(c.id, 'hp', d) : undefined} />
                      <CombatResource label="Stress" current={c.stress.current} max={c.stress.max} onAdjust={isDm ? (d) => adjustCombatant(c.id, 'stress', d) : undefined} />
                      <span className="text-slate-400">Evade {c.evasion}</span>
                    </div>
                  </div>
                ))}
              </div>
              {isDm && (
                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" size="sm" onClick={() => update({ round: session.round + 1 })}>
                    Next Round
                  </Button>
                  <Button variant="danger" size="sm" onClick={endCombat}>End Combat</Button>
                </div>
              )}
            </Card>
          )}

          {isDm && !session.combatActive && (
            <Card title="Start Combat">
              <div className="flex gap-3 items-end">
                <Select
                  label="Load Encounter"
                  value=""
                  onChange={(e) => { if (e.target.value) startCombat(e.target.value); }}
                  className="flex-1"
                >
                  <option value="">Choose encounter...</option>
                  {encounters.map((enc) => (
                    <option key={enc.id} value={enc.id}>{enc.name}</option>
                  ))}
                </Select>
                <Button onClick={() => startCombat()}>Start Empty Combat</Button>
              </div>
            </Card>
          )}

          <Card title="Session Notes">
            <Textarea
              value={session.notes}
              onChange={(e) => update({ notes: e.target.value })}
              readOnly={!isDm}
              placeholder="Session notes..."
            />
          </Card>
        </div>

        <div className="space-y-4">
          {myCharacters.length > 1 && (
            <Select
              label="Character"
              value={selectedCharacterId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
            >
              {myCharacters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          )}

          {selectedCharacter && (
            <Card title={selectedCharacter.name}>
              <CharacterSheet
                character={selectedCharacter}
                compact
                canEdit={!!(isDm || playerSession?.playerId === selectedCharacter.playerId)}
                onSave={(c) => saveCharacter(campaignId!, c)}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function HopeFearTracker({
  label,
  value,
  color,
  onAdjust,
}: {
  label: string;
  value: number;
  color: 'sky' | 'purple';
  onAdjust?: (delta: number) => void;
}) {
  const colors = { sky: 'text-sky-400', purple: 'text-purple-400' };
  return (
    <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg px-4 py-2">
      <span className="text-sm text-slate-400">{label}</span>
      {onAdjust && <button onClick={() => onAdjust(-1)} className="text-slate-500 hover:text-slate-300">−</button>}
      <span className={`text-2xl font-bold ${colors[color]}`}>{value}</span>
      {onAdjust && <button onClick={() => onAdjust(1)} className="text-slate-500 hover:text-slate-300">+</button>}
    </div>
  );
}

function CombatResource({
  label,
  current,
  max,
  onAdjust,
}: {
  label: string;
  current: number;
  max: number;
  onAdjust?: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-slate-500">{label}</span>
      {onAdjust && <button onClick={() => onAdjust(-1)} className="text-slate-500 hover:text-slate-300 text-xs">−</button>}
      <span className="text-slate-200">{current}/{max}</span>
      {onAdjust && <button onClick={() => onAdjust(1)} className="text-slate-500 hover:text-slate-300 text-xs">+</button>}
    </div>
  );
}
