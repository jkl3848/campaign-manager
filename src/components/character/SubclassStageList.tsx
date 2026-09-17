import type { SubclassStage } from '../../types';
import {
  SUBCLASS_STAGES,
  featuresForStage,
  minLevelForStage,
  stageLabel,
  type SubclassConfig,
} from '../../lib/subclasses';

interface SubclassStageListProps {
  subclass: SubclassConfig;
  /** Highest unlocked stage. Omit in inspect mode to show every stage. */
  unlockedThrough?: SubclassStage;
  compact?: boolean;
  /** Show later stages as preview with unlock labels instead of dimming them. */
  inspect?: boolean;
}

const STAGE_ORDER: SubclassStage[] = [...SUBCLASS_STAGES];

function isUnlocked(stage: SubclassStage, unlockedThrough?: SubclassStage): boolean {
  if (!unlockedThrough) return true;
  return STAGE_ORDER.indexOf(stage) <= STAGE_ORDER.indexOf(unlockedThrough);
}

export function SubclassStageList({
  subclass,
  unlockedThrough,
  compact = false,
  inspect = false,
}: SubclassStageListProps) {
  return (
    <div className="space-y-2">
      {SUBCLASS_STAGES.map((stage) => {
        const unlocked = inspect || isUnlocked(stage, unlockedThrough);
        const features = featuresForStage(subclass, stage);
        const minLevel = minLevelForStage(stage);
        const showUnlockLabel = stage !== 'foundation' && (inspect || !unlocked);

        return (
          <div
            key={stage}
            className={`rounded-lg p-3 ${
              unlocked ? 'bg-slate-800/60' : 'bg-slate-900/40 opacity-60'
            }`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className={`text-xs font-semibold uppercase tracking-wide ${unlocked ? 'text-amber-400' : 'text-slate-500'}`}>
                {stageLabel(stage)}
              </p>
              {showUnlockLabel && (
                <span className="text-[10px] text-slate-500">
                  Tier {stage === 'specialization' ? 3 : 4} · Lv {minLevel}+
                </span>
              )}
            </div>
            {features.length > 0 ? (
              <ul className="space-y-1">
                {features.map((feat) => (
                  <li
                    key={feat}
                    className={`flex gap-1 ${compact ? 'text-xs' : 'text-sm'} ${unlocked ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    <span className="text-amber-500">•</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`italic ${compact ? 'text-xs' : 'text-sm'} text-slate-500`}>
                {unlocked || inspect ? 'No features written yet.' : `Unlocks at level ${minLevel}.`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
