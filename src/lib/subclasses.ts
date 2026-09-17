import classes from '../config/daggerheart/classes.json';
import type { Character, SubclassStage } from '../types';

export type SubclassConfig = {
  id: string;
  name: string;
  description: string;
  foundation: string[];
  specialization: string[];
  mastery: string[];
};

export const SUBCLASS_STAGES: SubclassStage[] = ['foundation', 'specialization', 'mastery'];

export function stageLabel(stage: SubclassStage): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

export function nextSubclassStage(stage: SubclassStage): SubclassStage | null {
  if (stage === 'foundation') return 'specialization';
  if (stage === 'specialization') return 'mastery';
  return null;
}

export function minLevelForStage(stage: SubclassStage): number {
  if (stage === 'specialization') return 5;
  if (stage === 'mastery') return 8;
  return 1;
}

export function featuresForStage(subclass: SubclassConfig, stage: SubclassStage): string[] {
  return subclass[stage] ?? [];
}

export interface SubclassTrack {
  source: 'primary' | 'multiclass';
  classId: string;
  subclassId: string;
  name: string;
  stage: SubclassStage;
  subclass: SubclassConfig;
}

export function findSubclass(classId: string, subclassId: string): SubclassConfig | undefined {
  const cls = classes.find((c) => c.id === classId);
  return cls?.subclasses.find((s) => s.id === subclassId) as SubclassConfig | undefined;
}

export function getSubclassTracks(char: Character): SubclassTrack[] {
  const tracks: SubclassTrack[] = [];
  const primary = findSubclass(char.classId, char.subclassId);
  if (primary) {
    tracks.push({
      source: 'primary',
      classId: char.classId,
      subclassId: primary.id,
      name: primary.name,
      stage: char.subclassStage ?? 'foundation',
      subclass: primary,
    });
  }

  if (char.multiclass) {
    const multiclass = findSubclass(char.multiclass.classId, char.multiclass.subclassId);
    if (multiclass) {
      tracks.push({
        source: 'multiclass',
        classId: char.multiclass.classId,
        subclassId: multiclass.id,
        name: multiclass.name,
        stage: char.multiclass.subclassStage ?? 'foundation',
        subclass: multiclass,
      });
    }
  }

  return tracks;
}

export function hasMastery(char: Character): boolean {
  return getSubclassTracks(char).some((track) => track.stage === 'mastery');
}

export function getSubclassUpgradeTargets(char: Character, newLevel: number): SubclassTrack[] {
  return getSubclassTracks(char).filter((track) => {
    const next = nextSubclassStage(track.stage);
    if (!next) return false;
    if (newLevel < minLevelForStage(next)) return false;
    if (next === 'mastery' && hasMastery(char)) return false;
    return true;
  });
}
