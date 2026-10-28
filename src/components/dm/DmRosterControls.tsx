import { useState } from 'react';
import type { RosterStatus } from '../../types';
import { rosterStatus } from '../../lib/rosterStatus';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface DmRosterControlsProps {
  entityLabel: string;
  name: string;
  status?: RosterStatus;
  onStatusChange: (status: RosterStatus) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function DmRosterControls({
  entityLabel,
  name,
  status: statusProp,
  onStatusChange,
  onDelete,
}: DmRosterControlsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const status = rosterStatus({ status: statusProp });

  return (
    <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-brass/20 bg-black/20 px-4 py-3">
      <Select
        label="Status"
        value={status}
        className="min-w-[10rem] text-slate-200"
        onChange={async (e) => {
          const next = e.target.value as RosterStatus;
          setBusy(true);
          try {
            await onStatusChange(next);
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
      >
        <option value="active">Active</option>
        <option value="deceased">Deceased</option>
        <option value="retired">Retired</option>
      </Select>
      <Button variant="danger" size="sm" disabled={busy} onClick={() => setConfirmOpen(true)}>
        Delete {entityLabel}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        confirming={busy}
        title={`Delete ${entityLabel}?`}
        message={`Permanently delete “${name}”? This cannot be undone.`}
        confirmLabel={`Delete ${entityLabel}`}
        onConfirm={async () => {
          setBusy(true);
          try {
            await onDelete();
            setConfirmOpen(false);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
