export type TraitId = 'agility' | 'strength' | 'finesse' | 'instinct' | 'presence' | 'knowledge';

export interface Traits {
  agility: number;
  strength: number;
  finesse: number;
  instinct: number;
  presence: number;
  knowledge: number;
}

export interface Ability {
  id?: string;
  name: string;
  description: string;
  cost?: string;
}

export interface Attack {
  name: string;
  range: string;
  damage: string;
  trait: TraitId;
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
}

export interface Character {
  id: string;
  campaignId: string;
  playerId: string;
  playerName: string;
  name: string;
  pronouns?: string;
  imageUrl?: string;
  ancestryId: string;
  communityId: string;
  classId: string;
  subclassId: string;
  traits: Traits;
  hp: { current: number; max: number };
  stress: { current: number; max: number };
  hope: number;
  evasion: number;
  armorScore: number;
  armorName?: string;
  weaponName?: string;
  weaponDamage?: string;
  weaponTrait?: TraitId;
  abilities: Ability[];
  inventory: InventoryItem[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Enemy {
  id: string;
  campaignId: string;
  name: string;
  imageUrl?: string;
  tier: number;
  hp: { current: number; max: number };
  stress: { current: number; max: number };
  evasion: number;
  difficulty: number;
  damageThresholds: { minor: number; major: number };
  attacks: Attack[];
  abilities: Ability[];
  tags: string[];
  notes?: string;
  templateId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Npc {
  id: string;
  campaignId: string;
  name: string;
  imageUrl?: string;
  description?: string;
  hp: { current: number; max: number };
  stress: { current: number; max: number };
  evasion: number;
  traits: Partial<Traits>;
  abilities: Ability[];
  inParty: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface EncounterEnemy {
  enemyId: string;
  name: string;
  count: number;
}

export interface Encounter {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  enemies: EncounterEnemy[];
  createdAt: number;
  updatedAt: number;
}

export interface Combatant {
  id: string;
  name: string;
  type: 'character' | 'enemy' | 'npc';
  refId: string;
  hp: { current: number; max: number };
  stress: { current: number; max: number };
  evasion: number;
  conditions: string[];
  initiative?: number;
}

export interface CanvasElement {
  id: string;
  type: 'path' | 'text' | 'image' | 'shape';
  data: Record<string, unknown>;
}

export interface Session {
  id: string;
  campaignId: string;
  name: string;
  active: boolean;
  combatActive: boolean;
  combatants: Combatant[];
  currentTurn?: string;
  round: number;
  hope: number;
  fear: number;
  canvasElements: CanvasElement[];
  notes: string;
  mapImageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DiceRoll {
  id: string;
  campaignId: string;
  sessionId: string;
  rollerName: string;
  white: number;
  black: number;
  modifier: number;
  total: number;
  isCrit: boolean;
  hopeGain: 'player' | 'dm' | 'none';
  label?: string;
  timestamp: number;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  dmId: string;
  inviteCode: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerSession {
  playerId: string;
  playerName: string;
  campaignId: string;
}
