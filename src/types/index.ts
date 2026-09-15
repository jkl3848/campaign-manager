export type TraitId = 'agility' | 'strength' | 'finesse' | 'instinct' | 'presence' | 'knowledge';

export type Tier = 1 | 2 | 3;

export type SubclassStage = 'foundation' | 'specialization' | 'mastery';

export interface ExperienceEntry {
  name: string;
  bonus: number;
}

export interface MulticlassInfo {
  classId: string;
  domainId: string;
  subclassId: string;
}

export interface LevelUpChoiceData {
  traits?: [TraitId, TraitId];
  experienceIndices?: [number, number];
  domainCardId?: string;
  hpAmount?: number;
  stressAmount?: number;
  multiclass?: MulticlassInfo;
}

export interface LevelUpChoice {
  advancementId: string;
  tier: Tier;
  data?: LevelUpChoiceData;
}

export interface PendingLevelUp {
  targetLevel: number;
  initiatedAt: number;
}

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

export interface DomainCard {
  id: string;
  domainId: string;
  level: number;
  name: string;
  description: string;
  type?: string;
  recallCost?: number;
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
  imageUrl?: string;
  ancestryId: string;
  communityId: string;
  classId: string;
  subclassId: string;
  transformationId?: string;
  traits: Traits;
  level: number;
  hp: { current: number; max: number };
  stress: { current: number; max: number };
  hope: number;
  evasion: number;
  armorId?: string;
  armorScore: number;
  armorName?: string;
  armorSlots: { marked: number; max: number };
  damageThresholds: { major: number; severe: number };
  weaponName?: string;
  weaponDamage?: string;
  weaponTrait?: TraitId;
  hopeFeature?: string;
  abilities: Ability[];
  feats: Ability[];
  domainCards: DomainCard[];
  /** @deprecated Use experienceEntries */
  experiences?: string[];
  experienceEntries: ExperienceEntry[];
  proficiency: number;
  /** Extra damage threshold bonus from advancements */
  thresholdBonus: number;
  markedTraits: TraitId[];
  /** Marked advancement slots keyed as "tier:advancementId" */
  advancementSlots: Record<string, number>;
  disabledAdvancements: string[];
  subclassStage: SubclassStage;
  multiclass?: MulticlassInfo;
  pendingLevelUp?: PendingLevelUp;
  inventory: InventoryItem[];
  description?: string;
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
  secret?: boolean;
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
