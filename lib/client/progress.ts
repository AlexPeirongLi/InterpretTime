// Per-emotion counts for the conversation mode progress section.

import { EMOTIONS } from "@/lib/emotions";
import type { ConversationProgress, Emotion, Fit } from "@/lib/types";

export type FitSummary = { emotion: Emotion; counts: Record<Fit, number>; hints: number; total: number };

export function summariseFits(progress: ConversationProgress): FitSummary[] {
  return EMOTIONS.map((emotion) => {
    const results = progress.results.filter((r) => r.emotion === emotion);
    const counts: Record<Fit, number> = { in_tune: 0, partly: 0, missed: 0 };
    for (const r of results) counts[r.fit]++;
    return { emotion, counts, hints: results.filter((r) => r.usedHint).length, total: results.length };
  });
}

export const FIT_LABELS: Record<Fit, string> = {
  in_tune: "In tune",
  partly: "Partly",
  missed: "Missed the feeling",
};

export const FIT_SHORT: Record<Fit, string> = { in_tune: "In tune", partly: "Partly", missed: "Missed" };
