// Per-emotion counts for the conversation mode progress section.

import { BASIC_EMOTIONS, EMOTIONS } from "@/lib/emotions";
import type { ConversationProgress, Emotion, Fit } from "@/lib/types";

export type FitSummary = {
  emotion: Emotion;
  counts: Record<Fit, number>;
  hints: number;
  total: number;
  /** Tone results, from spoken replies only. */
  toneCounts: Record<Fit, number>;
  toneTotal: number;
};

/** True once at least 4 of the 5 basic emotions have had a reply that was in tune. */
export function readyForDeeperConversation(progress: ConversationProgress): boolean {
  return BASIC_EMOTIONS.filter((e) => progress.results.some((r) => r.emotion === e && r.fit === "in_tune")).length >= 4;
}

export function summariseFits(progress: ConversationProgress, emotions: readonly Emotion[] = EMOTIONS): FitSummary[] {
  return emotions.map((emotion) => {
    const results = progress.results.filter((r) => r.emotion === emotion);
    const counts: Record<Fit, number> = { in_tune: 0, partly: 0, missed: 0 };
    const toneCounts: Record<Fit, number> = { in_tune: 0, partly: 0, missed: 0 };
    for (const r of results) {
      counts[r.fit]++;
      if (r.toneFit) toneCounts[r.toneFit]++;
    }
    return {
      emotion,
      counts,
      hints: results.filter((r) => r.usedHint).length,
      total: results.length,
      toneCounts,
      toneTotal: results.filter((r) => r.toneFit).length,
    };
  });
}

export const TONE_LABELS: Record<Fit, string> = {
  in_tune: "Your tone fitted",
  partly: "Your tone partly fitted",
  missed: "Your tone didn't fit",
};

export const FIT_LABELS: Record<Fit, string> = {
  in_tune: "In tune",
  partly: "Partly",
  missed: "Missed the feeling",
};

export const FIT_SHORT: Record<Fit, string> = { in_tune: "In tune", partly: "Partly", missed: "Missed" };
