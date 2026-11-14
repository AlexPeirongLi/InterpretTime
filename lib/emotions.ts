import type { CueKind, Emotion, EmotionSet } from "./types";

/** The five emotions the site started with. */
export const BASIC_EMOTIONS = ["happy", "sad", "angry", "afraid", "neutral"] as const satisfies readonly Emotion[];

/** Harder emotions, each close to a basic one. See DEEPER-EMOTIONS.md. */
export const DEEPER_EMOTIONS = [
  "sarcastic",
  "frustrated",
  "disappointed",
  "nervous",
  "excited",
  "embarrassed",
  "bored",
  "relieved",
] as const satisfies readonly Emotion[];

export const EMOTIONS = [...BASIC_EMOTIONS, ...DEEPER_EMOTIONS] as const satisfies readonly Emotion[];

export const CUE_KINDS = ["words", "tone", "both"] as const satisfies readonly CueKind[];

export const EMOTION_SETS = ["basics", "both", "deeper"] as const satisfies readonly EmotionSet[];

export const EMOTION_LABELS: Record<Emotion, string> = {
  happy: "Happy",
  sad: "Sad",
  angry: "Angry",
  afraid: "Afraid",
  neutral: "Neutral",
  sarcastic: "Sarcastic",
  frustrated: "Frustrated",
  disappointed: "Disappointed",
  nervous: "Nervous",
  excited: "Excited",
  embarrassed: "Embarrassed",
  bored: "Bored",
  relieved: "Relieved",
};

/**
 * The basic emotion each deeper one is closest to: the one used to explain it.
 * Sarcasm is close to happy because it usually borrows happy or positive words.
 */
export const CLOSEST_BASIC: Record<(typeof DEEPER_EMOTIONS)[number], (typeof BASIC_EMOTIONS)[number]> = {
  sarcastic: "happy",
  frustrated: "angry",
  disappointed: "sad",
  nervous: "afraid",
  excited: "happy",
  embarrassed: "afraid",
  bored: "neutral",
  relieved: "happy",
};

export const EMOTION_SET_LABELS: Record<EmotionSet, string> = {
  basics: "Basics",
  both: "Basics + deeper",
  deeper: "Deeper only",
};

export function isDeeper(emotion: Emotion): boolean {
  return (DEEPER_EMOTIONS as readonly Emotion[]).includes(emotion);
}

/** The emotions practised with a given set. Missing means "basics". */
export function emotionsFor(set: EmotionSet = "basics"): readonly Emotion[] {
  if (set === "deeper") return DEEPER_EMOTIONS;
  if (set === "both") return EMOTIONS;
  return BASIC_EMOTIONS;
}
