import type { CueKind, Emotion } from "./types";

export const EMOTIONS = [
  "happy",
  "sad",
  "angry",
  "afraid",
  "neutral",
] as const satisfies readonly Emotion[];

export const CUE_KINDS = [
  "words",
  "tone",
  "both",
] as const satisfies readonly CueKind[];

export const EMOTION_LABELS: Record<Emotion, string> = {
  happy: "Happy",
  sad: "Sad",
  angry: "Angry",
  afraid: "Afraid",
  neutral: "Neutral",
};
