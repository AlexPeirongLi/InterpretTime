import { EMOTION_LABELS } from "@/lib/emotions";
import { summarise, type EmotionStatus } from "@/lib/profile";
import type { Profile } from "@/lib/types";
import type { Emotion } from "@/lib/types";

const DOT_STYLES: Record<Emotion, string> = {
  happy: "bg-amber-500",
  sad: "bg-sky-500",
  angry: "bg-red-500",
  afraid: "bg-violet-500",
  neutral: "bg-zinc-400",
};

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

export function ProfilePanel({ profile }: { profile: Profile }) {
  const rows = summarise(profile);
  return (
    <div>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.emotion}
            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={`size-2.5 rounded-full ${DOT_STYLES[row.emotion]}`}
              />
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
      <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        An emotion shows as recognised when you got the latest one right. Saved in this browser only.
      </p>
    </div>
  );
}
