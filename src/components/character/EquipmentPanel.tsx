import type { Character } from '../../types';
import type { CatalogEntry } from '../../lib/equipment';
import {
  formatEquippedWeaponSummary,
  inventoryArmorItems,
  inventoryWeaponsForSlot,
} from '../../lib/equipment';
import { formatWeaponDamage } from '../../lib/weaponDamage';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Button } from '../ui/Button';

interface EquipmentPanelProps {
  char: Character;
  canEdit: boolean;
  compact?: boolean;
  catalogOptions: CatalogEntry[];
  onAddCatalogItem: (entryId: string) => void;
  onEquipWeapon: (inventoryItemId: string, slot: 'primary' | 'secondary') => void;
  onUnequipWeapon: (slot: 'primary' | 'secondary') => void;
  onEquipArmor: (inventoryItemId: string) => void;
  onUnequipArmor: () => void;
  onRemoveInventoryItem?: (inventoryItemId: string) => void;
  onWeaponAttack?: (label: string, modifier: number) => void;
  onWeaponDamage?: (label: string, count: number, sides: number, modifier: number) => void;
}

export function EquipmentPanel({
  char,
  canEdit,
  compact = false,
  catalogOptions,
  onAddCatalogItem,
  onEquipWeapon,
  onUnequipWeapon,
  onEquipArmor,
  onUnequipArmor,
  onRemoveInventoryItem,
  onWeaponAttack,
  onWeaponDamage,
}: EquipmentPanelProps) {
  const primaryOptions = inventoryWeaponsForSlot(char.inventory, 'primary');
  const secondaryOptions = inventoryWeaponsForSlot(char.inventory, 'secondary');
  const armorOptions = inventoryArmorItems(char.inventory);
  const secondaryBlocked = !!char.primaryWeapon?.twoHanded;

  const textSize = compact ? 'text-[11px]' : 'text-sm';
  const muted = compact ? 'text-ink-faint' : 'text-ink-muted';

  return (
    <div className="space-y-3">
      <EquipSlot
        label="Primary"
        compact={compact}
        summary={
          char.primaryWeapon
            ? formatEquippedWeaponSummary(char.primaryWeapon, char.proficiency)
            : 'Empty'
        }
        detail={
          char.primaryWeapon?.feature ||
          (char.primaryWeapon
            ? `${char.primaryWeapon.trait}${char.primaryWeapon.range ? ` · ${char.primaryWeapon.range}` : ''}`
            : undefined)
        }
        canEdit={canEdit}
        onUnequip={char.primaryWeapon ? () => onUnequipWeapon('primary') : undefined}
        equipOptions={primaryOptions.map((i) => ({
          value: i.id,
          label: i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name,
        }))}
        onEquip={(id) => onEquipWeapon(id, 'primary')}
        equipPlaceholder="Equip primary from inventory..."
        emptyEquipText="No primary weapons in inventory"
      >
        {char.primaryWeapon && (onWeaponAttack || onWeaponDamage) && (
          <WeaponRollButtons
            weapon={char.primaryWeapon}
            proficiency={char.proficiency}
            traits={char.traits}
            onWeaponAttack={onWeaponAttack}
            onWeaponDamage={onWeaponDamage}
          />
        )}
      </EquipSlot>

      <EquipSlot
        label="Secondary"
        compact={compact}
        summary={
          secondaryBlocked && !char.secondaryWeapon
            ? 'Blocked (two-handed primary)'
            : char.secondaryWeapon
              ? formatEquippedWeaponSummary(char.secondaryWeapon, char.proficiency)
              : 'Empty'
        }
        detail={char.secondaryWeapon?.feature}
        canEdit={canEdit}
        onUnequip={char.secondaryWeapon ? () => onUnequipWeapon('secondary') : undefined}
        equipOptions={
          secondaryBlocked
            ? []
            : secondaryOptions.map((i) => ({
                value: i.id,
                label: i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name,
              }))
        }
        onEquip={(id) => onEquipWeapon(id, 'secondary')}
        equipPlaceholder="Equip secondary from inventory..."
        emptyEquipText={
          secondaryBlocked
            ? 'Unequip two-handed primary to use a secondary'
            : 'No secondary weapons in inventory'
        }
      >
        {char.secondaryWeapon && (onWeaponAttack || onWeaponDamage) && (
          <WeaponRollButtons
            weapon={char.secondaryWeapon}
            proficiency={char.proficiency}
            traits={char.traits}
            onWeaponAttack={onWeaponAttack}
            onWeaponDamage={onWeaponDamage}
          />
        )}
      </EquipSlot>

      <EquipSlot
        label="Armor"
        compact={compact}
        summary={
          char.armorId && char.armorId !== 'none'
            ? (char.armorName ?? char.armorId)
            : 'Unarmored'
        }
        detail={
          char.armorId && char.armorId !== 'none'
            ? `Score ${char.armorScore}`
            : undefined
        }
        canEdit={canEdit}
        onUnequip={
          char.armorId && char.armorId !== 'none' ? () => onUnequipArmor() : undefined
        }
        equipOptions={armorOptions.map((i) => ({
          value: i.id,
          label: i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name,
        }))}
        onEquip={onEquipArmor}
        equipPlaceholder="Equip armor from inventory..."
        emptyEquipText="No armor in inventory"
      />

      <div>
        <p className={`mb-1 font-display text-[10px] uppercase tracking-[0.16em] ${muted}`}>
          Inventory
        </p>
        <div className="space-y-1">
          {char.inventory.length === 0 ? (
            <p className={`${textSize} italic ${muted}`}>Nothing stowed.</p>
          ) : (
            char.inventory.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 border-b border-ink/15 py-1"
              >
                <div className="min-w-0">
                  <p className={`${compact ? 'font-serif text-[12px]' : 'font-serif text-sm'} text-ink`}>
                    {item.name}
                    {item.quantity > 1 && (
                      <span className={`ml-1 ${muted}`}>×{item.quantity}</span>
                    )}
                  </p>
                  {item.description && !compact && (
                    <p className="text-[11px] text-ink-muted line-clamp-2">{item.description}</p>
                  )}
                </div>
                {canEdit && onRemoveInventoryItem && (
                  <button
                    type="button"
                    onClick={() => onRemoveInventoryItem(item.id)}
                    className="shrink-0 text-[10px] text-ink-faint hover:text-oxblood"
                    title="Remove one"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        {canEdit && (
          <div className="mt-2">
            <SearchableSelect
              placeholder="Add from equipment catalog..."
              options={catalogOptions.map((entry) => ({
                value: `${entry.kind}:${entry.id}`,
                label: entry.name,
                detail: entry.detail,
                group: entry.kind,
              }))}
              onSelect={(value) => onAddCatalogItem(value)}
              emptyText="No equipment at your tier"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function EquipSlot({
  label,
  summary,
  detail,
  compact,
  canEdit,
  onUnequip,
  equipOptions,
  onEquip,
  equipPlaceholder,
  emptyEquipText,
  children,
}: {
  label: string;
  summary: string;
  detail?: string;
  compact?: boolean;
  canEdit: boolean;
  onUnequip?: () => void;
  equipOptions: { value: string; label: string }[];
  onEquip: (inventoryItemId: string) => void;
  equipPlaceholder: string;
  emptyEquipText: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-ink/15 p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            {label}
          </p>
          <p className={`font-serif ${compact ? 'text-xs' : 'text-sm'} text-ink`}>{summary}</p>
          {detail && (
            <p className="mt-0.5 text-[11px] text-ink-muted line-clamp-2">{detail}</p>
          )}
        </div>
        {canEdit && onUnequip && (
          <Button size="sm" variant="ghost" onClick={onUnequip}>
            Unequip
          </Button>
        )}
      </div>
      {children}
      {canEdit && !onUnequip && (
        <div className="mt-2">
          {equipOptions.length === 0 ? (
            <p className="text-[11px] italic text-ink-faint">{emptyEquipText}</p>
          ) : (
            <select
              className="w-full rounded-none border-0 border-b border-ink/30 bg-transparent py-1 text-xs text-ink focus:border-brass focus:outline-none"
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                onEquip(e.target.value);
                e.target.value = '';
              }}
            >
              <option value="">{equipPlaceholder}</option>
              {equipOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

function WeaponRollButtons({
  weapon,
  proficiency,
  traits,
  onWeaponAttack,
  onWeaponDamage,
}: {
  weapon: NonNullable<Character['primaryWeapon']>;
  proficiency: number;
  traits: Character['traits'];
  onWeaponAttack?: (label: string, modifier: number) => void;
  onWeaponDamage?: (label: string, count: number, sides: number, modifier: number) => void;
}) {
  const attackMod = traits[weapon.trait];
  const damage = {
    count: Math.max(1, proficiency),
    sides: weapon.damage.dice,
    modifier: weapon.damage.modifier,
  };
  const damageLabel = formatWeaponDamage({
    dice: damage.sides,
    count: damage.count,
    modifier: damage.modifier,
  });

  return (
    <div className="mt-2 grid grid-cols-2 gap-1">
      {onWeaponAttack ? (
        <button
          type="button"
          onClick={() => onWeaponAttack(`${weapon.name} Attack`, attackMod)}
          title={`Roll attack (${weapon.trait} ${attackMod >= 0 ? '+' : ''}${attackMod})`}
          className="flex w-full items-center justify-between border border-ink/15 px-2 py-1.5 cursor-pointer transition-colors hover:border-oxblood/30"
        >
          <span className="truncate text-[11px] text-ink-muted">Attack</span>
          <span className="font-display text-sm font-semibold text-ink">
            {attackMod >= 0 ? '+' : ''}
            {attackMod}
          </span>
        </button>
      ) : (
        <div className="flex items-center justify-between border border-ink/15 px-2 py-1.5">
          <span className="text-[11px] text-ink-faint">Attack</span>
          <span className="font-display text-sm text-ink-faint">
            {attackMod >= 0 ? '+' : ''}
            {attackMod}
          </span>
        </div>
      )}
      {onWeaponDamage ? (
        <button
          type="button"
          onClick={() =>
            onWeaponDamage(`${weapon.name} Damage`, damage.count, damage.sides, damage.modifier)
          }
          title={`Roll damage (${damageLabel})`}
          className="flex w-full items-center justify-between border border-ink/15 px-2 py-1.5 cursor-pointer transition-colors hover:border-oxblood/30"
        >
          <span className="truncate text-[11px] text-ink-muted">Damage</span>
          <span className="font-display text-sm font-semibold text-ink">{damageLabel}</span>
        </button>
      ) : (
        <div className="flex items-center justify-between border border-ink/15 px-2 py-1.5">
          <span className="text-[11px] text-ink-faint">Damage</span>
          <span className="font-display text-sm text-ink-faint">{damageLabel}</span>
        </div>
      )}
    </div>
  );
}
