import { BASIC_EMOTIONS, DEEPER_EMOTIONS, EMOTION_LABELS, isDeeper } from "@/lib/emotions";
import { FIT_SHORT } from "@/lib/client/progress";
import type { ConversationProgress, Emotion, EmotionSet, Fit } from "@/lib/types";

const FITS: Fit[] = ["in_tune", "partly", "missed"];

const DOT_COLORS: Record<Fit, string> = {
  in_tune: "bg-emerald-600 dark:bg-emerald-500",
  partly: "bg-amber-500 dark:bg-amber-400",
  missed: "bg-rose-500 dark:bg-rose-400",
};

/** One dot per reply, oldest first. */
function Dots({ fits, label, small = false }: { fits: Fit[]; label: string; small?: boolean }) {
  return (
    <div role="img" aria-label={`${label}: ${fits.map((fit) => FIT_SHORT[fit].toLowerCase()).join(", ")}`} className="flex flex-wrap justify-end gap-1.5">
      {fits.map((fit, i) => (
        <span key={i} className={`rounded-full ${small ? "size-2" : "size-3"} ${DOT_COLORS[fit]}`} />
      ))}
    </div>
  );
}

function Rows({ emotions, progress }: { emotions: readonly Emotion[]; progress: ConversationProgress }) {
  return (
    <ul className="flex flex-col gap-3">
      {emotions.map((emotion) => {
        const results = progress.results.filter((r) => r.emotion === emotion);
        const tone = results.flatMap((r) => (r.toneFit ? [r.toneFit] : []));
        const name = EMOTION_LABELS[emotion];
        return (
          <li key={emotion} className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="self-start font-medium sm:self-auto">{name}</span>
            {results.length === 0 ? (
              <span aria-label={`${name}: not met yet`} className="size-3 rounded-full border border-zinc-400 dark:border-zinc-600" />
            ) : (
              <div className="flex flex-col items-end gap-1">
                <Dots fits={results.map((r) => r.fit)} label={`${name}, words`} />
                {tone.length > 0 && <Dots fits={tone} label={`${name}, tone`} small />}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Progress as dots: one dot per reply, oldest first, for each emotion. */
export function FitProgress({
  progress,
  emotionSet = "basics",
}: {
  progress: ConversationProgress;
  emotionSet?: EmotionSet;
}) {
  // Deeper emotions start folded away, and open once they are in use.
  const deeperInUse = emotionSet !== "basics" || progress.results.some((r) => isDeeper(r.emotion));

  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300" aria-hidden>
        {FITS.map((fit) => (
          <span key={fit} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${DOT_COLORS[fit]}`} />
            {FIT_SHORT[fit]}
          </span>
        ))}
      </p>
      <Rows emotions={BASIC_EMOTIONS} progress={progress} />
      <details open={deeperInUse}>
        <summary className="cursor-pointer text-sm text-zinc-600 dark:text-zinc-300">More emotions</summary>
        <div className="mt-3">
          <Rows emotions={DEEPER_EMOTIONS} progress={progress} />
        </div>
      </details>
    </div>
  );
}
