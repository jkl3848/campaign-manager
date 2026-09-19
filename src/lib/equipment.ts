import equipment from '../config/daggerheart/equipment.json';
import type {
  Character,
  EquippedWeapon,
  EquipmentKind,
  InventoryItem,
  TraitId,
  WeaponDamage,
} from '../types';
import { computeArmorStats } from './characterArmor';
import { formatWeaponDamage, normalizeWeaponDamage } from './weaponDamage';

export interface CatalogWeapon {
  id: string;
  name: string;
  damage: { dice: number; modifier: number; count?: number };
  range: string;
  trait: string;
  physical: boolean;
  twoHanded: boolean;
  secondary: boolean;
  feature: string;
  tier: number;
}

export interface CatalogArmor {
  id: string;
  name: string;
  score: number;
  thresholdMajor: number;
  thresholdSevere: number;
  description: string;
  tier?: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  tier?: number;
}

export interface CatalogEntry {
  id: string;
  name: string;
  kind: EquipmentKind;
  tier: number;
  description?: string;
  detail?: string;
  secondary?: boolean;
  twoHanded?: boolean;
}

export function getCatalogWeapons(): CatalogWeapon[] {
  return equipment.weapons as CatalogWeapon[];
}

export function getCatalogArmor(): CatalogArmor[] {
  return equipment.armor as CatalogArmor[];
}

export function getCatalogItems(): CatalogItem[] {
  return equipment.items as CatalogItem[];
}

export function listCatalogEntries(maxTier: number): CatalogEntry[] {
  const weapons: CatalogEntry[] = getCatalogWeapons()
    .filter((w) => w.tier <= maxTier)
    .map((w) => {
      const damage = normalizeWeaponDamage(w.damage)!;
      return {
        id: w.id,
        name: w.name,
        kind: 'weapon' as const,
        tier: w.tier,
        description: w.feature || undefined,
        detail: [
          formatWeaponDamage(damage),
          w.trait,
          w.range,
          w.secondary ? 'Secondary' : null,
          w.twoHanded ? 'Two-handed' : null,
        ]
          .filter(Boolean)
          .join(' · '),
        secondary: w.secondary,
        twoHanded: w.twoHanded,
      };
    });

  const armor: CatalogEntry[] = getCatalogArmor()
    .filter((a) => a.id !== 'none' && (a.tier ?? 1) <= maxTier)
    .map((a) => ({
      id: a.id,
      name: a.name,
      kind: 'armor' as const,
      tier: a.tier ?? 1,
      description: a.description,
      detail: `Score ${a.score} · Thresholds ${a.thresholdMajor}/${a.thresholdSevere}`,
    }));

  const items: CatalogEntry[] = getCatalogItems()
    .filter((i) => (i.tier ?? 1) <= maxTier)
    .map((i) => ({
      id: i.id,
      name: i.name,
      kind: 'item' as const,
      tier: i.tier ?? 1,
      description: i.description,
      detail: i.description,
    }));

  return [...weapons, ...armor, ...items].sort((a, b) => a.name.localeCompare(b.name));
}

export function findCatalogWeapon(id: string): CatalogWeapon | undefined {
  return getCatalogWeapons().find((w) => w.id === id);
}

export function findCatalogArmor(id: string): CatalogArmor | undefined {
  return getCatalogArmor().find((a) => a.id === id);
}

export function findCatalogItem(id: string): CatalogItem | undefined {
  return getCatalogItems().find((i) => i.id === id);
}

export function findCatalogEntry(id: string, kind?: EquipmentKind): CatalogEntry | undefined {
  return listCatalogEntries(99).find(
    (e) => e.id === id && (kind == null || e.kind === kind),
  );
}

export function toEquippedWeapon(
  weapon: CatalogWeapon,
  proficiency = 1,
): EquippedWeapon {
  const base = normalizeWeaponDamage(weapon.damage)!;
  return {
    equipmentId: weapon.id,
    name: weapon.name,
    damage: {
      dice: base.dice,
      count: Math.max(1, proficiency),
      modifier: base.modifier,
    },
    trait: weapon.trait as TraitId,
    physical: weapon.physical,
    twoHanded: weapon.twoHanded,
    secondary: weapon.secondary,
    feature: weapon.feature || undefined,
    range: weapon.range,
  };
}

export function equippedWeaponFromLegacy(char: Character): EquippedWeapon | undefined {
  if (char.primaryWeapon) {
    return {
      ...char.primaryWeapon,
      damage: normalizeWeaponDamage(char.primaryWeapon.damage) ?? char.primaryWeapon.damage,
    };
  }
  if (!char.weaponName && !char.weaponDamage) return undefined;
  const damage = normalizeWeaponDamage(char.weaponDamage);
  if (!damage) return undefined;
  const matched = getCatalogWeapons().find(
    (w) => w.name.toLowerCase() === (char.weaponName ?? '').toLowerCase(),
  );
  return {
    equipmentId: matched?.id ?? '',
    name: char.weaponName ?? matched?.name ?? 'Weapon',
    damage: {
      ...damage,
      count: Math.max(damage.count, char.proficiency ?? 1),
    },
    trait: char.weaponTrait ?? (matched?.trait as TraitId) ?? 'strength',
    physical: char.weaponPhysical ?? matched?.physical ?? true,
    twoHanded: char.weaponTwoHanded ?? matched?.twoHanded ?? false,
    secondary: char.weaponSecondary ?? matched?.secondary ?? false,
    feature: char.weaponFeature ?? (matched?.feature || undefined),
    range: matched?.range,
  };
}

function inventoryItemFromWeapon(weapon: EquippedWeapon): InventoryItem {
  return {
    id: crypto.randomUUID(),
    equipmentId: weapon.equipmentId || undefined,
    kind: 'weapon',
    name: weapon.name,
    description: weapon.feature,
    quantity: 1,
  };
}

function inventoryItemFromArmor(armorId: string, armorName?: string): InventoryItem | null {
  if (!armorId || armorId === 'none') return null;
  const catalog = findCatalogArmor(armorId);
  return {
    id: crypto.randomUUID(),
    equipmentId: armorId,
    kind: 'armor',
    name: catalog?.name ?? armorName ?? armorId,
    description: catalog?.description,
    quantity: 1,
  };
}

export function addCatalogToInventory(
  inventory: InventoryItem[],
  entry: CatalogEntry,
): InventoryItem[] {
  const existing = inventory.find(
    (i) => i.equipmentId === entry.id && (i.kind ?? entry.kind) === entry.kind,
  );
  if (existing) {
    return inventory.map((i) =>
      i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i,
    );
  }
  return [
    ...inventory,
    {
      id: crypto.randomUUID(),
      equipmentId: entry.id,
      kind: entry.kind,
      name: entry.name,
      description: entry.description,
      quantity: 1,
    },
  ];
}

export function removeFromInventory(
  inventory: InventoryItem[],
  itemId: string,
  amount = 1,
): InventoryItem[] {
  return inventory.flatMap((item) => {
    if (item.id !== itemId) return [item];
    const nextQty = item.quantity - amount;
    if (nextQty <= 0) return [];
    return [{ ...item, quantity: nextQty }];
  });
}

function withLegacyPrimaryFields(
  char: Character,
  primary: EquippedWeapon | undefined,
): Character {
  return {
    ...char,
    primaryWeapon: primary,
    weaponName: primary?.name,
    weaponDamage: primary?.damage,
    weaponTrait: primary?.trait,
    weaponPhysical: primary?.physical,
    weaponTwoHanded: primary?.twoHanded,
    weaponSecondary: primary?.secondary,
    weaponFeature: primary?.feature,
  };
}

export function inventoryWeaponsForSlot(
  inventory: InventoryItem[],
  slot: 'primary' | 'secondary',
): InventoryItem[] {
  return inventory.filter((item) => {
    if (item.kind && item.kind !== 'weapon') return false;
    if (!item.equipmentId) return false;
    const weapon = findCatalogWeapon(item.equipmentId);
    if (!weapon) return false;
    return slot === 'secondary' ? weapon.secondary : !weapon.secondary;
  });
}

export function inventoryArmorItems(inventory: InventoryItem[]): InventoryItem[] {
  return inventory.filter((item) => {
    if (item.kind === 'armor') return true;
    if (item.kind === 'weapon' || item.kind === 'item') return false;
    return !!item.equipmentId && !!findCatalogArmor(item.equipmentId);
  });
}

export function equipWeaponFromInventory(
  char: Character,
  inventoryItemId: string,
  slot: 'primary' | 'secondary',
): Character {
  const item = char.inventory.find((i) => i.id === inventoryItemId);
  if (!item?.equipmentId) return char;
  const catalog = findCatalogWeapon(item.equipmentId);
  if (!catalog) return char;
  if (slot === 'primary' && catalog.secondary) return char;
  if (slot === 'secondary' && !catalog.secondary) return char;
  if (slot === 'secondary' && char.primaryWeapon?.twoHanded) return char;

  let inventory = removeFromInventory(char.inventory, inventoryItemId);
  const equipped = toEquippedWeapon(catalog, char.proficiency);

  if (slot === 'primary') {
    if (char.primaryWeapon) {
      inventory = [
        ...inventory,
        inventoryItemFromWeapon(char.primaryWeapon),
      ];
    }
    let secondaryWeapon = char.secondaryWeapon;
    if (equipped.twoHanded && secondaryWeapon) {
      inventory = [...inventory, inventoryItemFromWeapon(secondaryWeapon)];
      secondaryWeapon = undefined;
    }
    return withLegacyPrimaryFields(
      { ...char, inventory, secondaryWeapon },
      equipped,
    );
  }

  if (char.secondaryWeapon) {
    inventory = [...inventory, inventoryItemFromWeapon(char.secondaryWeapon)];
  }
  return { ...char, inventory, secondaryWeapon: equipped };
}

export function unequipWeapon(char: Character, slot: 'primary' | 'secondary'): Character {
  if (slot === 'primary') {
    if (!char.primaryWeapon) return char;
    const inventory = [...char.inventory, inventoryItemFromWeapon(char.primaryWeapon)];
    return withLegacyPrimaryFields({ ...char, inventory }, undefined);
  }
  if (!char.secondaryWeapon) return char;
  return {
    ...char,
    inventory: [...char.inventory, inventoryItemFromWeapon(char.secondaryWeapon)],
    secondaryWeapon: undefined,
  };
}

export function equipArmorFromInventory(
  char: Character,
  inventoryItemId: string,
): Character {
  const item = char.inventory.find((i) => i.id === inventoryItemId);
  if (!item?.equipmentId) return char;
  const catalog = findCatalogArmor(item.equipmentId);
  if (!catalog || catalog.id === 'none') return char;

  let inventory = removeFromInventory(char.inventory, inventoryItemId);
  const previous = inventoryItemFromArmor(char.armorId ?? 'none', char.armorName);
  if (previous) inventory = [...inventory, previous];

  const stats = computeArmorStats(catalog.id, char.level);
  return {
    ...char,
    inventory,
    armorId: catalog.id,
    armorName: catalog.name,
    armorScore: stats.armorScore,
    armorSlots: {
      marked: Math.min(char.armorSlots.marked, stats.armorSlots.max),
      max: stats.armorSlots.max,
    },
    damageThresholds: {
      major: stats.damageThresholds.major + char.thresholdBonus,
      severe: stats.damageThresholds.severe + char.thresholdBonus,
    },
  };
}

export function unequipArmor(char: Character): Character {
  if (!char.armorId || char.armorId === 'none') return char;
  const returned = inventoryItemFromArmor(char.armorId, char.armorName);
  const inventory = returned ? [...char.inventory, returned] : char.inventory;
  const stats = computeArmorStats('none', char.level);
  return {
    ...char,
    inventory,
    armorId: 'none',
    armorName: 'Unarmored',
    armorScore: stats.armorScore,
    armorSlots: { marked: 0, max: 0 },
    damageThresholds: {
      major: stats.damageThresholds.major + char.thresholdBonus,
      severe: stats.damageThresholds.severe + char.thresholdBonus,
    },
  };
}

export function formatEquippedWeaponSummary(
  weapon: EquippedWeapon,
  proficiency: number,
): string {
  const damage: WeaponDamage = {
    dice: weapon.damage.dice,
    count: Math.max(1, proficiency),
    modifier: weapon.damage.modifier,
  };
  return `${weapon.name} (${formatWeaponDamage(damage)})`;
}
