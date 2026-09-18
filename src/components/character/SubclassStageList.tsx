import type { SubclassStage } from "../../types";
import {
  SUBCLASS_STAGES,
  featuresForStage,
  minLevelForStage,
  stageLabel,
  type SubclassConfig,
} from "../../lib/subclasses";

interface SubclassStageListProps {
  subclass: SubclassConfig;
  /** Highest unlocked stage. Omit in inspect mode to show every stage. */
  unlockedThrough?: SubclassStage;
  compact?: boolean;
  /** Show later stages as preview with unlock labels instead of dimming them. */
  inspect?: boolean;
}

const STAGE_ORDER: SubclassStage[] = [...SUBCLASS_STAGES];

function isUnlocked(
  stage: SubclassStage,
  unlockedThrough?: SubclassStage,
): boolean {
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
        const showUnlockLabel =
          stage !== "foundation" && (inspect || !unlocked);

        return (
          <div
            key={stage}
            className={`border p-3 ${
              unlocked ? "border-ink/20 bg-black/[0.03]" : "border-ink/10 opacity-60"
            }`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <p
                className={`font-display text-xs font-semibold uppercase tracking-[0.16em] ${unlocked ? "text-oxblood" : "text-ink-faint"}`}
              >
                {stageLabel(stage)}
              </p>
              {showUnlockLabel && (
                <span className="text-[10px] text-ink-faint">
                  Tier {stage === "specialization" ? 3 : 4} · Lv {minLevel}+
                </span>
              )}
            </div>
            {features.length > 0 ? (
              <ul className="space-y-1">
                {features.map((feat) => (
                  <li
                    key={feat.id}
                    className={`flex gap-1 font-serif ${compact ? "text-xs" : "text-sm"} ${unlocked ? "text-ink" : "text-ink-muted"}`}
                  >
                    <span className="text-oxblood">•</span>
                    <span>{feat.description}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className={`font-serif italic ${compact ? "text-xs" : "text-sm"} text-ink-faint`}
              >
                {unlocked || inspect
                  ? "No features written yet."
                  : `Unlocks at level ${minLevel}.`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
