import { EMOTION_LABELS } from "@/lib/emotions";
import type { Emotion } from "@/lib/types";

export const EMOTION_STYLES: Record<Emotion, string> = {
  happy: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
  sad: "bg-sky-100 text-sky-900 dark:bg-sky-400/20 dark:text-sky-200",
  angry: "bg-red-100 text-red-900 dark:bg-red-400/20 dark:text-red-200",
  afraid: "bg-violet-100 text-violet-900 dark:bg-violet-400/20 dark:text-violet-200",
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700/60 dark:text-zinc-200",
};

export function EmotionChip({ emotion, prefix }: { emotion: Emotion; prefix?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${EMOTION_STYLES[emotion]}`}
    >
      {prefix}
      {EMOTION_LABELS[emotion]}
    </span>
  );
}
