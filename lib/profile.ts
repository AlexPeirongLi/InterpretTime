import { BASIC_EMOTIONS, EMOTIONS } from "./emotions";
import type { Attempt, Emotion, Profile } from "./types";

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
 * Needs two in a row right to become "recognised", and two in a row wrong to
 * drop back to "learning". A single lucky guess or slip doesn't flip it.
 */
function statusFromAttempts(attempts: Attempt[]): EmotionStatus {
  if (attempts.length === 0) return "not heard yet";
  let status: EmotionStatus = "learning";
  let streak = 0;
  for (const attempt of attempts) {
    const matchesFlip = status === "learning" ? attempt.recognised : !attempt.recognised;
    streak = matchesFlip ? streak + 1 : 0;
    if (streak >= 2) {
      status = status === "learning" ? "recognised" : "learning";
      streak = 0;
    }
  }
  return status;
}

/** Per-emotion counts for the profile side panel, in the order given. */
export function summarise(profile: Profile, emotions: readonly Emotion[] = EMOTIONS): EmotionSummary[] {
  return emotions.map((emotion) => {
    const attempts = profile.attempts.filter((a) => a.emotion === emotion);
    const recognised = attempts.filter((a) => a.recognised).length;
    return { emotion, heard: attempts.length, recognised, status: statusFromAttempts(attempts) };
  });
}

/** True once at least 4 of the 5 basic emotions show as recognised: time to suggest deeper ones. */
export function readyForDeeper(profile: Profile): boolean {
  return summarise(profile, BASIC_EMOTIONS).filter((row) => row.status === "recognised").length >= 4;
}
