import { EMOTION_LABELS } from "@/lib/emotions";
import type { Emotion } from "@/lib/types";

export const EMOTION_STYLES: Record<Emotion, string> = {
  happy: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
  sad: "bg-sky-100 text-sky-900 dark:bg-sky-400/20 dark:text-sky-200",
  angry: "bg-red-100 text-red-900 dark:bg-red-400/20 dark:text-red-200",
  afraid: "bg-violet-100 text-violet-900 dark:bg-violet-400/20 dark:text-violet-200",
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700/60 dark:text-zinc-200",
  sarcastic: "bg-lime-100 text-lime-900 dark:bg-lime-400/20 dark:text-lime-200",
  frustrated: "bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-200",
  disappointed: "bg-indigo-100 text-indigo-900 dark:bg-indigo-400/20 dark:text-indigo-200",
  nervous: "bg-purple-100 text-purple-900 dark:bg-purple-400/20 dark:text-purple-200",
  excited: "bg-yellow-100 text-yellow-900 dark:bg-yellow-400/20 dark:text-yellow-200",
  embarrassed: "bg-pink-100 text-pink-900 dark:bg-pink-400/20 dark:text-pink-200",
  bored: "bg-stone-200 text-stone-800 dark:bg-stone-500/30 dark:text-stone-200",
  relieved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200",
};

/** A stronger colour for small dots, which the pale chip colours are too faint for. */
export const EMOTION_DOTS: Record<Emotion, string> = {
  happy: "bg-amber-500",
  sad: "bg-sky-500",
  angry: "bg-red-500",
  afraid: "bg-violet-500",
  neutral: "bg-zinc-400",
  sarcastic: "bg-lime-500",
  frustrated: "bg-orange-500",
  disappointed: "bg-indigo-500",
  nervous: "bg-purple-500",
  excited: "bg-yellow-400",
  embarrassed: "bg-pink-500",
  bored: "bg-stone-400",
  relieved: "bg-emerald-500",
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
