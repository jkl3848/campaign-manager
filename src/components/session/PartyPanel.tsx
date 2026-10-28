import { useState } from 'react';
import type { Character, Npc, Session } from '../../types';
import { isPlayable } from '../../lib/rosterStatus';
import { rosterNpcVisible, sessionJoinedCharacterIds } from '../../lib/sessionParty';
import { Button } from '../ui/Button';
import { Popup } from '../ui/Popup';
import { CharacterSheet } from '../character/CharacterSheet';
import { NpcSessionSheet } from './NpcSessionSheet';
import classes from '../../config/daggerheart/classes.json';

export type PartySelection =
  | { kind: 'character'; id: string }
  | { kind: 'npc'; id: string }
  | null;

interface PartyPanelProps {
  session: Session;
  characters: Character[];
  npcs: Npc[];
  isDm: boolean;
  playerId?: string;
  selection: PartySelection;
  onSelect: (selection: PartySelection) => void;
  onJoinCharacter: (character: Character) => Promise<void>;
  onLeaveCharacter: (character: Character) => Promise<void>;
  onToggleNpcParty: (npc: Npc, inParty: boolean) => Promise<void>;
  onSaveCharacter: (character: Character) => Promise<void>;
  onSaveNpc: (npc: Npc) => Promise<void>;
  onTraitRoll?: (traitName: string, modifier: number) => void;
  onWeaponAttack?: (label: string, modifier: number) => void;
  onWeaponDamage?: (label: string, count: number, sides: number, modifier: number) => void;
}

export function PartyPanel({
  session,
  characters,
  npcs,
  isDm,
  playerId,
  selection,
  onSelect,
  onJoinCharacter,
  onLeaveCharacter,
  onToggleNpcParty,
  onSaveCharacter,
  onSaveNpc,
  onTraitRoll,
  onWeaponAttack,
  onWeaponDamage,
}: PartyPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);

  const joinedIds = sessionJoinedCharacterIds(session, characters);
  const partyCharacters = characters.filter((c) => joinedIds.has(c.id) && isPlayable(c));
  const partyNpcs = npcs.filter((n) => n.inParty && isPlayable(n));
  const partyCount = partyCharacters.length + partyNpcs.length;

  const rosterCharacters = characters.filter((c) => !joinedIds.has(c.id));
  const rosterNpcs = npcs.filter((n) => !n.inParty && rosterNpcVisible(n, isDm));
  const rosterCount = rosterCharacters.length + rosterNpcs.length;

  const addableCharacters = rosterCharacters.filter((c) => isPlayable(c));

  const selectedCharacter =
    selection?.kind === 'character'
      ? characters.find((c) => c.id === selection.id)
      : undefined;
  const selectedNpc =
    selection?.kind === 'npc' ? npcs.find((n) => n.id === selection.id) : undefined;

  const canEditCharacter = (c: Character) =>
    isDm || (!!playerId && c.playerId === playerId);

  const canJoinCharacter = (c: Character) =>
    isPlayable(c) && (isDm || (!!playerId && c.playerId === playerId));

  if (selectedCharacter) {
    return (
      <aside className="absolute right-0 top-0 bottom-0 z-20 flex w-80 flex-col border-l border-brass/25 bg-[#140e0a]/92 backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-brass/20 px-3 py-2.5">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-amber-200"
          >
            ← Party
          </button>
          <h2 className="min-w-0 flex-1 truncate font-display text-sm font-semibold tracking-wide text-amber-100">
            {selectedCharacter.name}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <CharacterSheet
            character={selectedCharacter}
            party={characters}
            layout="session"
            canEdit={canEditCharacter(selectedCharacter)}
            isDm={isDm}
            onSave={onSaveCharacter}
            onTraitRoll={onTraitRoll}
            onWeaponAttack={onWeaponAttack}
            onWeaponDamage={onWeaponDamage}
          />
        </div>
      </aside>
    );
  }

  if (selectedNpc) {
    return (
      <aside className="absolute right-0 top-0 bottom-0 z-20 flex w-80 flex-col border-l border-brass/25 bg-[#140e0a]/92 backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-brass/20 px-3 py-2.5">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-amber-200"
          >
            ← Party
          </button>
          <h2 className="min-w-0 flex-1 truncate font-display text-sm font-semibold tracking-wide text-amber-100">
            {selectedNpc.name}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <NpcSessionSheet
            npc={selectedNpc}
            canEdit={isDm}
            onSave={onSaveNpc}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className="absolute right-0 top-0 bottom-0 z-20 flex w-80 flex-col border-l border-brass/25 bg-[#140e0a]/92 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-brass/20 px-3 py-2.5">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-amber-200">
          Party ({partyCount})
        </h2>
        {isDm && (
          <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
            Add
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {partyCount === 0 ? (
          <p className="text-xs italic text-slate-600">
            {isDm ? 'Add players to the session party.' : 'Join with a character to appear here.'}
          </p>
        ) : (
          <>
            {partyCharacters.map((c) => {
              const cls = classes.find((cl) => cl.id === c.classId);
              return (
                <PartyMemberRow
                  key={`char-${c.id}`}
                  name={c.name}
                  subtitle={`${c.playerName} · Lv ${c.level} ${cls?.name ?? ''}`}
                  imageUrl={c.imageUrl}
                  accent="amber"
                  isDm={isDm}
                  onOpen={() => onSelect({ kind: 'character', id: c.id })}
                  onRemove={() => onLeaveCharacter(c)}
                />
              );
            })}
            {partyNpcs.map((n) => (
              <PartyMemberRow
                key={`npc-${n.id}`}
                name={n.name}
                subtitle="NPC · In party"
                imageUrl={n.imageUrl}
                accent="sky"
                isDm={isDm}
                onOpen={() => onSelect({ kind: 'npc', id: n.id })}
                onRemove={() => onToggleNpcParty(n, false)}
              />
            ))}
          </>
        )}

        {rosterCount > 0 && (
          <div className="border-t border-brass/15 pt-2">
            <button
              type="button"
              onClick={() => setRosterOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded px-1 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-amber-200/90"
            >
              <span>Characters ({rosterCount})</span>
              <span className="text-slate-600">{rosterOpen ? '▾' : '▸'}</span>
            </button>
            {rosterOpen && (
              <div className="mt-1.5 space-y-1.5">
                {rosterCharacters.map((c) => {
                  const cls = classes.find((cl) => cl.id === c.classId);
                  return (
                    <RosterRow
                      key={`roster-char-${c.id}`}
                      name={c.name}
                      detail={`${c.playerName} · ${cls?.name ?? ''}`}
                      imageUrl={c.imageUrl}
                      accent="amber"
                      actionLabel={canJoinCharacter(c) ? 'Join' : undefined}
                      onOpen={() => onSelect({ kind: 'character', id: c.id })}
                      onAction={
                        canJoinCharacter(c)
                          ? async () => {
                              await onJoinCharacter(c);
                            }
                          : undefined
                      }
                    />
                  );
                })}
                {rosterNpcs.map((n) => (
                  <RosterRow
                    key={`roster-npc-${n.id}`}
                    name={n.name}
                    detail={isDm && !n.playerVisible ? 'NPC · Hidden from players' : 'NPC'}
                    imageUrl={n.imageUrl}
                    accent="sky"
                    onOpen={() => onSelect({ kind: 'npc', id: n.id })}
                    onAction={
                      isDm
                        ? async () => {
                            await onToggleNpcParty(n, true);
                          }
                        : undefined
                    }
                    actionLabel={isDm ? 'To party' : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isDm && (
        <Popup open={showAdd} onClose={() => setShowAdd(false)} title="Add to Session Party" size="sm">
          <div className="max-h-80 overflow-y-auto">
            {addableCharacters.length === 0 ? (
              <p className="text-xs italic text-slate-600">Everyone is already in the session party.</p>
            ) : (
              <div className="space-y-1.5">
                {addableCharacters.map((c) => {
                  const cls = classes.find((cl) => cl.id === c.classId);
                  return (
                    <AddRow
                      key={c.id}
                      name={c.name}
                      detail={`${c.playerName} · ${cls?.name ?? ''}`}
                      imageUrl={c.imageUrl}
                      accent="amber"
                      onAdd={async () => {
                        await onJoinCharacter(c);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </Popup>
      )}
    </aside>
  );
}

function PartyMemberRow({
  name,
  subtitle,
  imageUrl,
  accent,
  isDm,
  onOpen,
  onRemove,
}: {
  name: string;
  subtitle: string;
  imageUrl?: string;
  accent: 'amber' | 'sky';
  isDm: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const avatarBg =
    accent === 'amber' ? 'bg-amber-950/50 text-amber-400' : 'bg-sky-950/50 text-sky-400';

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-900/70 px-2.5 py-2">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
        ) : (
          <div className={`flex h-8 w-8 items-center justify-center rounded text-xs font-bold ${avatarBg}`}>
            {name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-200">{name}</p>
          <p className="truncate text-[10px] text-slate-500">{subtitle}</p>
        </div>
      </button>
      {isDm && (
        <button
          type="button"
          title="Remove from session party"
          onClick={onRemove}
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-red-950/40 hover:text-red-300"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function RosterRow({
  name,
  detail,
  imageUrl,
  accent,
  onOpen,
  onAction,
  actionLabel,
}: {
  name: string;
  detail: string;
  imageUrl?: string;
  accent: 'amber' | 'sky';
  onOpen: () => void;
  onAction?: () => Promise<void>;
  actionLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const avatarBg =
    accent === 'amber' ? 'bg-amber-950/50 text-amber-400' : 'bg-sky-950/50 text-sky-400';

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-900/40 px-2.5 py-2">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-7 w-7 rounded object-cover" />
        ) : (
          <div className={`flex h-7 w-7 items-center justify-center rounded text-[10px] font-bold ${avatarBg}`}>
            {name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-300">{name}</p>
          <p className="truncate text-[10px] text-slate-600">{detail}</p>
        </div>
      </button>
      {actionLabel && onAction && (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onAction();
            setBusy(false);
          }}
        >
          {busy ? '…' : actionLabel}
        </Button>
      )}
    </div>
  );
}

function AddRow({
  name,
  detail,
  imageUrl,
  accent,
  onAdd,
}: {
  name: string;
  detail: string;
  imageUrl?: string;
  accent: 'amber' | 'sky';
  onAdd: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const avatarBg =
    accent === 'amber' ? 'bg-amber-950/50 text-amber-400' : 'bg-sky-950/50 text-sky-400';

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-2.5 py-2">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-7 w-7 rounded object-cover" />
      ) : (
        <div className={`flex h-7 w-7 items-center justify-center rounded text-[10px] font-bold ${avatarBg}`}>
          {name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-200">{name}</p>
        <p className="truncate text-[10px] text-slate-500">{detail}</p>
      </div>
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onAdd();
          setBusy(false);
        }}
      >
        Add
      </Button>
    </div>
  );
}
