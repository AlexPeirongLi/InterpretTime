import { BASIC_EMOTIONS, DEEPER_EMOTIONS, EMOTION_LABELS, isDeeper } from "@/lib/emotions";
import { summarise, type EmotionStatus, type EmotionSummary } from "@/lib/profile";
import type { EmotionSet, Profile } from "@/lib/types";
import { EMOTION_DOTS } from "./EmotionChip";

const STATUS_STYLES: Record<EmotionStatus, string> = {
  recognised: "text-emerald-700 dark:text-emerald-300",
  learning: "text-amber-700 dark:text-amber-300",
  "not heard yet": "text-zinc-500 dark:text-zinc-400",
};

const STATUS_LABELS: Record<EmotionStatus, string> = {
  recognised: "Recognised",
  learning: "Still learning",
  "not heard yet": "Not heard yet",
};

function Rows({ rows }: { rows: EmotionSummary[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.emotion}
          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
        >
          <span className="flex items-center gap-2">
            <span aria-hidden className={`size-2.5 rounded-full ${EMOTION_DOTS[row.emotion]}`} />
            <span className="font-medium">{EMOTION_LABELS[row.emotion]}</span>
          </span>
          <span className="text-right text-sm">
            <span className={`block ${STATUS_STYLES[row.status]}`}>{STATUS_LABELS[row.status]}</span>
            {row.heard > 0 && (
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {row.recognised} of {row.heard} heard
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ProfilePanel({ profile, emotionSet = "basics" }: { profile: Profile; emotionSet?: EmotionSet }) {
  // Deeper emotions start folded away, and open once they are in use.
  const deeperInUse = emotionSet !== "basics" || profile.attempts.some((a) => isDeeper(a.emotion));
  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Basics</h3>
        <Rows rows={summarise(profile, BASIC_EMOTIONS)} />
      </section>
      <details open={deeperInUse} className="group">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Deeper emotions
        </summary>
        <div className="mt-2">
          <Rows rows={summarise(profile, DEEPER_EMOTIONS)} />
        </div>
      </details>
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        An emotion shows as recognised once you get two in a row right, and goes back to learning after two
        in a row wrong. Saved in this browser only.
      </p>
    </div>
  );
}
