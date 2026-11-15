import { BASIC_EMOTIONS, DEEPER_EMOTIONS, EMOTION_LABELS, isDeeper } from "@/lib/emotions";
import { FIT_SHORT } from "@/lib/client/progress";
import type { ConversationProgress, ConversationResult, Emotion, EmotionSet, Fit } from "@/lib/types";
import { EMOTION_DOTS } from "./EmotionChip";

const FITS: Fit[] = ["in_tune", "partly", "missed"];

// Each result is a colour AND a symbol, so it reads without colour too.
const DOT_STYLES: Record<Fit, string> = {
  in_tune: "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950",
  partly: "bg-amber-400 text-amber-950 dark:bg-amber-400",
  missed: "bg-white text-rose-700 ring-2 ring-inset ring-rose-500 dark:bg-zinc-950 dark:text-rose-300 dark:ring-rose-400",
};
const DOT_SYMBOLS: Record<Fit, string> = { in_tune: "✓", partly: "½", missed: "✕" };

const SCORE: Record<Fit, number> = { in_tune: 1, partly: 0.5, missed: 0 };

type Status = { label: string; style: string };
const STATUS_STYLES = {
  good: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200",
  middle: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
  low: "bg-rose-100 text-rose-900 dark:bg-rose-400/20 dark:text-rose-200",
  none: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

/** A plain-words summary of how an emotion is going, from the latest replies. */
function statusFor(results: ConversationResult[]): Status {
  if (results.length === 0) return { label: "Not practised yet", style: STATUS_STYLES.none };
  const recent = results.slice(-3);
  const score = recent.reduce((sum, r) => sum + SCORE[r.fit], 0) / recent.length;
  if (score >= 0.75) return { label: "Getting it", style: STATUS_STYLES.good };
  if (score >= 0.4) return { label: "Getting there", style: STATUS_STYLES.middle };
  return { label: "Needs practice", style: STATUS_STYLES.low };
}

function Dot({ fit, label, small = false }: { fit: Fit; label: string; small?: boolean }) {
  return (
    <li
      title={label}
      aria-label={label}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold leading-none ${DOT_STYLES[fit]} ${
        small ? "size-4 text-[9px]" : "size-6 text-xs"
      }`}
    >
      <span aria-hidden>{DOT_SYMBOLS[fit]}</span>
    </li>
  );
}

function DotRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-11 shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      <ol className="flex flex-wrap items-center gap-1.5">{children}</ol>
    </div>
  );
}

function EmotionRow({ emotion, results }: { emotion: Emotion; results: ConversationResult[] }) {
  const name = EMOTION_LABELS[emotion];
  const status = statusFor(results);
  const inTune = results.filter((r) => r.fit === "in_tune").length;
  const toned = results.filter((r) => r.toneFit);

  return (
    <li className="flex flex-col gap-2 rounded-xl px-3 py-3 ring-1 ring-zinc-200 dark:ring-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span aria-hidden className={`size-2.5 rounded-full ${EMOTION_DOTS[emotion]}`} />
          <span className="font-semibold">{name}</span>
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.style}`}>{status.label}</span>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No replies to someone feeling {name.toLowerCase()} yet.</p>
      ) : (
        <>
          <DotRow label="Words">
            {results.map((r, i) => (
              <Dot
                key={i}
                fit={r.fit}
                label={`${name}, reply ${i + 1}: words ${FIT_SHORT[r.fit].toLowerCase()}${r.usedHint ? ", with a hint" : ""}`}
              />
            ))}
          </DotRow>
          {toned.length > 0 && (
            <DotRow label="Tone">
              {toned.map((r, i) => (
                <Dot key={i} small fit={r.toneFit!} label={`${name}, spoken reply ${i + 1}: tone ${FIT_SHORT[r.toneFit!].toLowerCase()}`} />
              ))}
            </DotRow>
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {inTune} of {results.length} {results.length === 1 ? "reply" : "replies"} in tune
            {results.some((r) => r.usedHint) && `, ${results.filter((r) => r.usedHint).length} with a hint`}. Oldest
            first.
          </p>
        </>
      )}
    </li>
  );
}

function Summary({ progress, emotions }: { progress: ConversationProgress; emotions: readonly Emotion[] }) {
  const results = progress.results;
  const counts = Object.fromEntries(FITS.map((fit) => [fit, results.filter((r) => r.fit === fit).length])) as Record<Fit, number>;

  // The practised emotion going least well, once there is something to compare.
  const practised = emotions
    .map((emotion) => ({ emotion, mine: results.filter((r) => r.emotion === emotion) }))
    .filter((e) => e.mine.length > 0)
    .map((e) => ({ ...e, score: e.mine.slice(-3).reduce((sum, r) => sum + SCORE[r.fit], 0) / Math.min(e.mine.length, 3) }));
  const focus = practised.length >= 2 ? practised.sort((a, b) => a.score - b.score)[0] : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
      <p className="text-sm">
        You&apos;ve replied <span className="font-semibold">{results.length}</span> {results.length === 1 ? "time" : "times"}.
      </p>
      <ul className="grid grid-cols-3 gap-2 text-center">
        {FITS.map((fit) => (
          <li key={fit} className="flex flex-col items-center gap-1 rounded-lg bg-white px-2 py-2 dark:bg-zinc-950">
            <span aria-hidden className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${DOT_STYLES[fit]}`}>
              {DOT_SYMBOLS[fit]}
            </span>
            <span className="text-lg font-semibold leading-none">{counts[fit]}</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-300">{FIT_SHORT[fit]}</span>
          </li>
        ))}
      </ul>
      {progress.stepIns && progress.stepIns.copied + progress.stepIns.skipped > 0 && (
        <p className="text-sm text-zinc-700 dark:text-zinc-200">
          <span className="font-medium">Lines practised:</span> {progress.stepIns.copied + progress.stepIns.skipped}, and you
          got {progress.stepIns.copied} of them sounding right.
        </p>
      )}
      {focus && focus.score < 0.75 && (
        <p className="text-sm text-zinc-700 dark:text-zinc-200">
          <span className="font-medium">Worth practising next:</span> {EMOTION_LABELS[focus.emotion].toLowerCase()}.
        </p>
      )}
    </div>
  );
}

function Key() {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-zinc-600 dark:text-zinc-300">What the dots mean</summary>
      <ul className="mt-2 flex flex-col gap-1.5 text-zinc-600 dark:text-zinc-300">
        <li className="flex items-center gap-2">
          <span aria-hidden className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${DOT_STYLES.in_tune}`}>✓</span>
          In tune: your reply fitted how they felt.
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${DOT_STYLES.partly}`}>½</span>
          Partly: kind or on topic, but the feeling wasn&apos;t picked up.
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${DOT_STYLES.missed}`}>✕</span>
          Missed: the reply clashed with how they felt.
        </li>
        <li className="mt-1">
          One dot per reply, oldest first. <span className="font-medium">Words</span> is what you said;{" "}
          <span className="font-medium">Tone</span> is how you said it, for spoken replies. Hover over or focus a dot for
          details.
        </li>
      </ul>
    </details>
  );
}

/** Progress in conversation mode: one dot per reply, for each emotion, with plain-words summaries. */
export function FitProgress({
  progress,
  emotionSet = "basics",
}: {
  progress: ConversationProgress;
  emotionSet?: EmotionSet;
}) {
  // Deeper emotions start folded away, and open once they are in use.
  const deeperInUse = emotionSet !== "basics" || progress.results.some((r) => isDeeper(r.emotion));
  const forEmotion = (emotion: Emotion) => progress.results.filter((r) => r.emotion === emotion);
  const deeperPractised = DEEPER_EMOTIONS.filter((e) => forEmotion(e).length > 0).length;

  if (progress.results.length === 0) {
    return (
      <div className="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <p className="font-medium text-zinc-800 dark:text-zinc-100">No replies yet.</p>
        <p>
          After each conversation, every reply adds a dot here: one row per emotion, so you can see which feelings
          you&apos;re getting and which need more practice.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Summary progress={progress} emotions={deeperInUse ? [...BASIC_EMOTIONS, ...DEEPER_EMOTIONS] : BASIC_EMOTIONS} />
      <Key />
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Basics</h3>
        <ul className="flex flex-col gap-2">
          {BASIC_EMOTIONS.map((emotion) => (
            <EmotionRow key={emotion} emotion={emotion} results={forEmotion(emotion)} />
          ))}
        </ul>
      </section>
      <details open={deeperInUse}>
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Deeper emotions{deeperPractised > 0 && ` (${deeperPractised} practised)`}
        </summary>
        <ul className="mt-2 flex flex-col gap-2">
          {DEEPER_EMOTIONS.map((emotion) => (
            <EmotionRow key={emotion} emotion={emotion} results={forEmotion(emotion)} />
          ))}
        </ul>
      </details>
    </div>
  );
}
