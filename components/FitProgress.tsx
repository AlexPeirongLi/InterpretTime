import { EMOTION_LABELS } from "@/lib/emotions";
import { FIT_SHORT, summariseFits } from "@/lib/client/progress";
import type { ConversationProgress, Fit } from "@/lib/types";

const FITS: Fit[] = ["in_tune", "partly", "missed"];

const COUNT_STYLES: Record<Fit, string> = {
  in_tune: "text-emerald-700 dark:text-emerald-300",
  partly: "text-amber-700 dark:text-amber-300",
  missed: "text-rose-700 dark:text-rose-300",
};

/** Per emotion: how many replies were in tune, partly, or missed the feeling. */
export function FitProgress({ progress }: { progress: ConversationProgress }) {
  const rows = summariseFits(progress);
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.emotion} className="rounded-xl px-3 py-2 ring-1 ring-zinc-200 dark:ring-zinc-800">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{EMOTION_LABELS[row.emotion]}</span>
              {row.total === 0 && <span className="text-xs text-zinc-500 dark:text-zinc-400">Not met yet</span>}
              {row.hints > 0 && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {row.hints} with a hint
                </span>
              )}
            </div>
            {row.total > 0 && (
              <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                <dt className="w-12 text-zinc-500 dark:text-zinc-400">Words</dt>
                {FITS.map((fit) => (
                  <div key={fit} className="flex gap-1">
                    <dt className="text-zinc-500 dark:text-zinc-400">{FIT_SHORT[fit]}</dt>
                    <dd className={`font-semibold ${COUNT_STYLES[fit]}`}>{row.counts[fit]}</dd>
                  </div>
                ))}
              </dl>
            )}
            {row.toneTotal > 0 && (
              <dl className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                <dt className="w-12 text-zinc-500 dark:text-zinc-400">Tone</dt>
                {FITS.map((fit) => (
                  <div key={fit} className="flex gap-1">
                    <dt className="text-zinc-500 dark:text-zinc-400">{FIT_SHORT[fit]}</dt>
                    <dd className={`font-semibold ${COUNT_STYLES[fit]}`}>{row.toneCounts[fit]}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Counted once per reply. Tone is counted for spoken replies only. Saved in this browser only.
      </p>
    </div>
  );
}
