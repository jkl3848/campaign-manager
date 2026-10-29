import { formatWeaponDamage, normalizeWeaponDamage } from './weaponDamage';
import type {
  AttackRange,
  DamageType,
  EncounterEnemy,
  Enemy,
  EnemyAttack,
  EnemyFeature,
  EnemyType,
  FeatureType,
  Tier,
  WeaponDamage,
} from '../types';

export const ENEMY_TYPES: ReadonlyArray<{ id: EnemyType; label: string; points: number }> = [
  { id: 'minion', label: 'Minion', points: 0.5 },
  { id: 'social', label: 'Social', points: 1 },
  { id: 'support', label: 'Support', points: 1 },
  { id: 'horde', label: 'Horde', points: 2 },
  { id: 'ranged', label: 'Ranged', points: 2 },
  { id: 'skulk', label: 'Skulk', points: 2 },
  { id: 'standard', label: 'Standard', points: 2 },
  { id: 'leader', label: 'Leader', points: 3 },
  { id: 'bruiser', label: 'Bruiser', points: 4 },
  { id: 'solo', label: 'Solo', points: 5 },
];

export const ATTACK_RANGES: readonly AttackRange[] = [
  'Melee',
  'Very Close',
  'Close',
  'Far',
  'Very Far',
];

export const FEATURE_TYPES: ReadonlyArray<{ id: FeatureType; label: string }> = [
  { id: 'action', label: 'Action' },
  { id: 'passive', label: 'Passive' },
  { id: 'reaction', label: 'Reaction' },
];

export const DAMAGE_TYPES: ReadonlyArray<{ id: DamageType; label: string; short: string }> = [
  { id: 'physical', label: 'Physical', short: 'phy' },
  { id: 'draft', label: 'Draft', short: 'draft' },
];

const HEAVY_TYPES: ReadonlySet<EnemyType> = new Set(['bruiser', 'horde', 'leader', 'solo']);

export function pointsForType(type: EnemyType): number {
  return ENEMY_TYPES.find((t) => t.id === type)?.points ?? 2;
}

export function labelForType(type: EnemyType): string {
  return ENEMY_TYPES.find((t) => t.id === type)?.label ?? type;
}

export function formatAttack(a: EnemyAttack): string {
  const bonus = a.attackBonus >= 0 ? `+${a.attackBonus}` : `${a.attackBonus}`;
  const dmg = formatWeaponDamage(a.damage);
  const dtype = DAMAGE_TYPES.find((d) => d.id === a.damageType)?.short ?? a.damageType;
  return `${bonus} · ${dmg} ${dtype} · ${a.range}`;
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asTier(value: unknown): Tier {
  const n = asNumber(value, 1);
  if (n <= 1) return 1;
  if (n === 2) return 2;
  return 3;
}

function asEnemyType(value: unknown): EnemyType {
  if (typeof value === 'string' && ENEMY_TYPES.some((t) => t.id === value)) {
    return value as EnemyType;
  }
  return 'standard';
}

function asRange(value: unknown): AttackRange {
  if (typeof value === 'string' && (ATTACK_RANGES as readonly string[]).includes(value)) {
    return value as AttackRange;
  }
  return 'Melee';
}

function asDamageType(value: unknown): DamageType {
  if (value === 'draft' || value === 'physical') return value;
  if (value === false) return 'draft';
  return 'physical';
}

function normalizeDamage(raw: unknown): WeaponDamage {
  return (
    normalizeWeaponDamage(raw as string | WeaponDamage | undefined | null) ?? {
      count: 1,
      dice: 6,
      modifier: 0,
    }
  );
}

function normalizeAttack(raw: unknown, index: number): EnemyAttack {
  const a = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    id: typeof a.id === 'string' && a.id ? a.id : `atk-${index}`,
    name: typeof a.name === 'string' ? a.name : '',
    range: asRange(a.range),
    attackBonus: asNumber(a.attackBonus ?? a.modifier, 0),
    damage: normalizeDamage(a.damage),
    damageType: asDamageType(a.damageType ?? a.physical),
  };
}

function normalizeFeature(raw: unknown, index: number): EnemyFeature {
  const f = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const type =
    f.type === 'action' || f.type === 'passive' || f.type === 'reaction' ? f.type : 'passive';
  return {
    id: typeof f.id === 'string' && f.id ? f.id : `feat-${index}`,
    name: typeof f.name === 'string' ? f.name : '',
    type,
    description: typeof f.description === 'string' ? f.description : '',
  };
}

/** Migrate legacy Firestore enemy docs into the current Enemy shape. */
export function normalizeEnemy(raw: unknown): Enemy {
  const e = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const hpRaw = (e.hp && typeof e.hp === 'object' ? e.hp : {}) as Record<string, unknown>;
  const stressRaw = (e.stress && typeof e.stress === 'object' ? e.stress : {}) as Record<
    string,
    unknown
  >;
  const thresholdsRaw = (
    e.damageThresholds && typeof e.damageThresholds === 'object' ? e.damageThresholds : {}
  ) as Record<string, unknown>;

  // Old shape: { minor, major }. New shape: { major, severe }.
  const hasSevere = 'severe' in thresholdsRaw;
  const major = asNumber(
    hasSevere ? thresholdsRaw.major : thresholdsRaw.minor ?? thresholdsRaw.major,
    4,
  );
  const severe = asNumber(hasSevere ? thresholdsRaw.severe : thresholdsRaw.major, major + 4);

  const attacksRaw = Array.isArray(e.attacks) ? e.attacks : [];
  const featuresRaw = Array.isArray(e.features)
    ? e.features
    : Array.isArray(e.abilities)
      ? e.abilities
      : [];

  const hpMax = asNumber(hpRaw.max ?? e.hp, 3);
  const stressMax = asNumber(stressRaw.max ?? e.stress, 2);

  return {
    id: typeof e.id === 'string' ? e.id : '',
    campaignId: typeof e.campaignId === 'string' ? e.campaignId : '',
    name: typeof e.name === 'string' ? e.name : '',
    imageUrl: typeof e.imageUrl === 'string' ? e.imageUrl : undefined,
    tier: asTier(e.tier),
    type: asEnemyType(e.type),
    description:
      typeof e.description === 'string'
        ? e.description
        : typeof e.notes === 'string'
          ? e.notes
          : undefined,
    tactics: typeof e.tactics === 'string' ? e.tactics : undefined,
    difficulty: asNumber(e.difficulty ?? e.evasion, 10),
    damageThresholds: { major, severe: Math.max(severe, major + 1) },
    hp: {
      current: asNumber(hpRaw.current, hpMax),
      max: hpMax,
    },
    stress: {
      current: asNumber(stressRaw.current, 0),
      max: stressMax,
    },
    attacks: attacksRaw.map(normalizeAttack),
    features: featuresRaw.map(normalizeFeature),
    createdAt: asNumber(e.createdAt, Date.now()),
    updatedAt: asNumber(e.updatedAt, Date.now()),
  };
}

export type EncounterDifficultyLabel =
  | 'Easy'
  | 'Slightly easier'
  | 'On budget'
  | 'Slightly harder'
  | 'Hard';

export interface BudgetModifier {
  amount: number;
  reason: string;
}

export interface EncounterBudgetResult {
  base: number;
  modifiers: BudgetModifier[];
  budget: number;
  spent: number;
  delta: number;
  difficulty: EncounterDifficultyLabel;
}

export function difficultyFromDelta(delta: number): EncounterDifficultyLabel {
  if (delta < -2) return 'Easy';
  if (delta <= -0.5) return 'Slightly easier';
  if (delta === 0) return 'On budget';
  if (delta <= 2) return 'Slightly harder';
  return 'Hard';
}

export function calculateEncounterBudget(params: {
  pcCount: number;
  npcCount: number;
  partyTier: Tier;
  enemies: Enemy[];
  roster: EncounterEnemy[];
}): EncounterBudgetResult {
  const { pcCount, npcCount, partyTier, enemies, roster } = params;
  const base = 3 * pcCount + 1.5 * npcCount + 2;

  const enemyById = new Map(enemies.map((e) => [e.id, e]));
  let spent = 0;
  let soloCount = 0;
  let hasLowerTier = false;
  let hasHeavy = false;

  for (const row of roster) {
    const enemy = enemyById.get(row.enemyId);
    if (!enemy) continue;
    const pts = pointsForType(enemy.type);
    spent += pts * row.count;
    if (enemy.type === 'solo') soloCount += row.count;
    if (enemy.tier < partyTier) hasLowerTier = true;
    if (HEAVY_TYPES.has(enemy.type)) hasHeavy = true;
  }

  const modifiers: BudgetModifier[] = [];
  if (soloCount >= 2) {
    modifiers.push({ amount: -2, reason: '2 or more Solo adversaries' });
  }
  if (hasLowerTier) {
    modifiers.push({ amount: 1, reason: 'Includes a lower-tier adversary' });
  }
  if (roster.length > 0 && !hasHeavy) {
    modifiers.push({
      amount: 1,
      reason: 'No Bruiser, Horde, Leader, or Solo',
    });
  }

  const budget = base + modifiers.reduce((sum, m) => sum + m.amount, 0);
  const delta = spent - budget;

  return {
    base,
    modifiers,
    budget,
    spent,
    delta,
    difficulty: difficultyFromDelta(delta),
  };
}

export function spentBattlePoints(enemies: Enemy[], roster: EncounterEnemy[]): number {
  const enemyById = new Map(enemies.map((e) => [e.id, e]));
  return roster.reduce((sum, row) => {
    const enemy = enemyById.get(row.enemyId);
    if (!enemy) return sum;
    return sum + pointsForType(enemy.type) * row.count;
  }, 0);
}
