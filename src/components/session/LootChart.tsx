import type { CatalogEntry } from '../../lib/equipment';
import type { Character, EquipmentKind, Npc, Session } from '../../types';
import { isAdvancedNpc } from '../../lib/advancedNpc';
import { isPlayable } from '../../lib/rosterStatus';
import { sessionJoinedCharacterIds } from '../../lib/sessionParty';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

export type LootRecipient =
  | { kind: 'character'; id: string; name: string }
  | { kind: 'npc'; id: string; name: string };

export interface LootChartFilters {
  kinds: EquipmentKind[];
  maxTier: number;
}

interface LootChartProps {
  session: Session;
  characters: Character[];
  npcs: Npc[];
  entries: CatalogEntry[];
  filters: LootChartFilters;
  given: Record<number, string>;
  recipient: LootRecipient | null;
  assigningIndex: number | null;
  onFiltersChange: (filters: LootChartFilters) => void;
  onGenerate: () => void;
  onRecipientChange: (recipient: LootRecipient | null) => void;
  onAssign: (index: number, entry: CatalogEntry, recipient: LootRecipient) => void;
}

const KIND_OPTIONS: { kind: EquipmentKind; label: string }[] = [
  { kind: 'weapon', label: 'Weapons' },
  { kind: 'armor', label: 'Armor' },
  { kind: 'item', label: 'Items' },
];

function recipientKey(r: LootRecipient): string {
  return `${r.kind}:${r.id}`;
}

function parseRecipientKey(
  key: string,
  characters: Character[],
  npcs: Npc[],
): LootRecipient | null {
  const [kind, id] = key.split(':');
  if (kind === 'character') {
    const c = characters.find((x) => x.id === id);
    return c ? { kind: 'character', id: c.id, name: c.name } : null;
  }
  if (kind === 'npc') {
    const n = npcs.find((x) => x.id === id);
    return n ? { kind: 'npc', id: n.id, name: n.name } : null;
  }
  return null;
}

export function LootChart({
  session,
  characters,
  npcs,
  entries,
  filters,
  given,
  recipient,
  assigningIndex,
  onFiltersChange,
  onGenerate,
  onRecipientChange,
  onAssign,
}: LootChartProps) {
  const joinedIds = sessionJoinedCharacterIds(session, characters);
  const partyCharacters = characters.filter((c) => joinedIds.has(c.id) && isPlayable(c));
  const partyNpcs = npcs.filter((n) => n.inParty && isPlayable(n) && isAdvancedNpc(n));

  const recipients: LootRecipient[] = [
    ...partyCharacters.map((c) => ({
      kind: 'character' as const,
      id: c.id,
      name: c.name,
    })),
    ...partyNpcs.map((n) => ({
      kind: 'npc' as const,
      id: n.id,
      name: n.name,
    })),
  ];

  const toggleKind = (kind: EquipmentKind) => {
    const has = filters.kinds.includes(kind);
    const kinds = has
      ? filters.kinds.filter((k) => k !== kind)
      : [...filters.kinds, kind];
    onFiltersChange({ ...filters, kinds });
  };

  const left = entries.slice(0, 12);
  const right = entries.slice(12, 24);
  const canAssign = !!recipient && assigningIndex === null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-400">Type</p>
          <div className="flex flex-wrap gap-3">
            {KIND_OPTIONS.map(({ kind, label }) => (
              <label
                key={kind}
                className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={filters.kinds.includes(kind)}
                  onChange={() => toggleKind(kind)}
                  className="accent-amber-500"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <Select
          label="Max tier"
          value={String(filters.maxTier)}
          onChange={(e) =>
            onFiltersChange({ ...filters, maxTier: Number(e.target.value) })
          }
          className="w-20"
        >
          {[1, 2, 3, 4].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        <Button
          size="sm"
          onClick={onGenerate}
          disabled={filters.kinds.length === 0}
        >
          {entries.length > 0 ? 'Regenerate' : 'Generate'}
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm italic text-slate-400">
          Generate a chart of 24 random items. Players roll dice; you find the
          matching row and assign it.
        </p>
      ) : (
        <>
          <Select
            label="Assign to"
            value={recipient ? recipientKey(recipient) : ''}
            onChange={(e) => {
              const next = e.target.value
                ? parseRecipientKey(e.target.value, characters, npcs)
                : null;
              onRecipientChange(next);
            }}
          >
            <option value="">Select party member...</option>
            {recipients.map((r) => (
              <option key={recipientKey(r)} value={recipientKey(r)}>
                {r.name}
                {r.kind === 'npc' ? ' (NPC)' : ''}
              </option>
            ))}
          </Select>

          {recipients.length === 0 && (
            <p className="text-xs text-amber-400/90">
              No party members with inventories are in this session.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <ChartColumn
              entries={left}
              startIndex={0}
              given={given}
              canAssign={canAssign}
              assigningIndex={assigningIndex}
              onAssign={(index, entry) => {
                if (!recipient) return;
                onAssign(index, entry, recipient);
              }}
            />
            <ChartColumn
              entries={right}
              startIndex={12}
              given={given}
              canAssign={canAssign}
              assigningIndex={assigningIndex}
              onAssign={(index, entry) => {
                if (!recipient) return;
                onAssign(index, entry, recipient);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ChartColumn({
  entries,
  startIndex,
  given,
  canAssign,
  assigningIndex,
  onAssign,
}: {
  entries: CatalogEntry[];
  startIndex: number;
  given: Record<number, string>;
  canAssign: boolean;
  assigningIndex: number | null;
  onAssign: (index: number, entry: CatalogEntry) => void;
}) {
  return (
    <ol className="space-y-1">
      {entries.map((entry, i) => {
        const index = startIndex + i;
        const rowNumber = index + 1;
        const givenTo = given[index];
        const busy = assigningIndex === index;
        const title = [entry.detail, entry.description].filter(Boolean).join(' — ');

        return (
          <li
            key={`${rowNumber}-${entry.kind}-${entry.id}`}
            className="flex items-start gap-2 rounded-lg bg-slate-900/70 px-2.5 py-1.5 text-xs"
            title={title || undefined}
          >
            <span className="w-5 shrink-0 pt-0.5 text-right font-mono font-bold text-amber-400/90">
              {rowNumber}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-100">{entry.name}</p>
              <p className="truncate text-[10px] capitalize text-slate-400">
                {entry.kind} · T{entry.tier}
                {entry.detail ? ` · ${entry.detail}` : ''}
              </p>
              {givenTo && (
                <p className="mt-0.5 text-[10px] text-sky-400">Given to {givenTo}</p>
              )}
            </div>
            {!givenTo && (
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 !px-2 !py-0.5"
                disabled={!canAssign || busy}
                onClick={() => onAssign(index, entry)}
              >
                {busy ? '…' : 'Assign'}
              </Button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
