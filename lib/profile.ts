import { BASIC_EMOTIONS, EMOTIONS } from "./emotions";
import type { Emotion, Profile } from "./types";

export type EmotionStatus = "not heard yet" | "learning" | "recognised";

export type EmotionSummary = {
  emotion: Emotion;
  /** How many practice sentences with this emotion the person has answered. */
  heard: number;
  /** How many of those they recognised. */
  recognised: number;
  status: EmotionStatus;
};

export function emptyProfile(): Profile {
  return { attempts: [] };
}

/**
 * Per-emotion counts for the profile side panel, in the order given.
 * An emotion counts as "recognised" once the person's most recent attempt at
 * it was right, so the panel moves as they learn.
 */
export function summarise(profile: Profile, emotions: readonly Emotion[] = EMOTIONS): EmotionSummary[] {
  return emotions.map((emotion) => {
    const attempts = profile.attempts.filter((a) => a.emotion === emotion);
    const recognised = attempts.filter((a) => a.recognised).length;
    const latest = attempts.at(-1);
    const status: EmotionStatus = !latest
      ? "not heard yet"
      : latest.recognised
        ? "recognised"
        : "learning";
    return { emotion, heard: attempts.length, recognised, status };
  });
}

/** True once at least 4 of the 5 basic emotions show as recognised: time to suggest deeper ones. */
export function readyForDeeper(profile: Profile): boolean {
  return summarise(profile, BASIC_EMOTIONS).filter((row) => row.status === "recognised").length >= 4;
}
