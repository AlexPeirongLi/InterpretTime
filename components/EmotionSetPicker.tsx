import { EMOTION_SETS, EMOTION_SET_LABELS } from "@/lib/emotions";
import type { EmotionSet } from "@/lib/types";

const HELP: Record<EmotionSet, string> = {
  basics: "Happy, sad, angry, afraid and calm.",
  both: "The basics plus harder ones like sarcasm, frustration and disappointment.",
  deeper: "Only the harder ones: sarcastic, frustrated, disappointed, nervous, excited, embarrassed, bored, relieved.",
};

type Props = {
  value: EmotionSet;
  onChange: (set: EmotionSet) => void;
  disabled?: boolean;
  /** Smaller, for a header. */
  compact?: boolean;
};

/** Choose which emotions to practise: Basics, Basics + deeper, or Deeper only. */
export function EmotionSetPicker({ value, onChange, disabled, compact }: Props) {
  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className={compact ? "sr-only" : "mb-1.5 text-sm font-medium"}>Which emotions?</legend>
      <div role="radiogroup" className="inline-flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
        {EMOTION_SETS.map((set) => (
          <button
            key={set}
            type="button"
            role="radio"
            aria-checked={value === set}
            onClick={() => onChange(set)}
            className={`rounded-lg font-medium transition disabled:opacity-50 ${compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"} ${
              value === set
                ? "bg-white text-teal-800 shadow-sm dark:bg-zinc-950 dark:text-teal-300"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            }`}
          >
            {EMOTION_SET_LABELS[set]}
          </button>
        ))}
      </div>
      {!compact && <p className="text-xs text-zinc-500 dark:text-zinc-400">{HELP[value]}</p>}
    </fieldset>
  );
}
