// Turns voice measurements into plain words for Claude, so it judges "a bit
// faster and louder than usual" rather than raw numbers. See TONE-CHECK.md.
//
// The thresholds come from measuring ElevenLabs voices saying the same
// sentence in each emotion: against the calm version, sad was about 2-6
// semitones lower, 2-5 dB quieter, about 10% slower and half as varied in
// pitch; angry was 4-8 semitones higher, 3-5 dB louder and about 5-10% faster.

import type { Baseline, ReplyDelivery } from "@/lib/types";

/** "slightly", "", "much" + word, depending on how big the change is. */
function grade(change: number, small: number, medium: number, large: number, up: string, down: string): string | null {
  const size = Math.abs(change);
  if (size < small) return null;
  const word = change > 0 ? up : down;
  if (size >= large) return `much ${word}`;
  if (size >= medium) return word;
  return `slightly ${word}`;
}

function againstBaseline(delivery: ReplyDelivery, baseline: Baseline): string[] {
  const m = delivery.measured;
  const notes: string[] = [];

  if (m.pitchHz && baseline.pitchHz) {
    const pitch = grade(12 * Math.log2(m.pitchHz / baseline.pitchHz), 1.5, 3, 6, "higher", "lower");
    notes.push(pitch ? `Pitch: ${pitch} than their normal voice.` : "Pitch: about the same as their normal voice.");
  }
  if (m.pitchRange && baseline.pitchRange) {
    const ratio = m.pitchRange / baseline.pitchRange;
    notes.push(
      ratio < 0.6
        ? "Pitch movement: much flatter than usual, close to a monotone."
        : ratio < 0.8
          ? "Pitch movement: flatter than usual."
          : ratio > 1.4
            ? "Pitch movement: much more up and down than usual, very animated."
            : ratio > 1.2
              ? "Pitch movement: more up and down than usual."
              : "Pitch movement: about as varied as usual.",
    );
  }
  const loud = grade(m.loudnessDb - baseline.loudnessDb, 1.5, 3, 6, "louder", "softer");
  notes.push(loud ? `Loudness: ${loud} than usual.` : "Loudness: about as loud as usual.");

  const speed = wordsPerSecond(delivery);
  if (speed && baseline.wordsPerSecond > 0) {
    const pace = grade(Math.log(speed / baseline.wordsPerSecond) * 100, 8, 18, 35, "faster", "slower");
    notes.push(pace ? `Pace: ${pace} than usual.` : "Pace: about their usual speed.");
  }
  return notes;
}

/** Without a baseline only pace and pitch movement mean much on their own. */
function withoutBaseline(delivery: ReplyDelivery): string[] {
  const m = delivery.measured;
  const notes = ["There is no recording of their normal voice, so pitch and loudness can't be compared. Be more cautious."];
  if (m.pitchRange != null) {
    notes.push(
      m.pitchRange < 4
        ? "Pitch movement: quite flat."
        : m.pitchRange > 11
          ? "Pitch movement: very up and down."
          : "Pitch movement: an ordinary amount.",
    );
  }
  const speed = wordsPerSecond(delivery);
  if (speed) {
    notes.push(
      speed > 4.5 ? "Pace: fast." : speed > 3.7 ? "Pace: a little quick." : speed < 2.3 ? "Pace: slow." : "Pace: an ordinary speed.",
    );
  }
  return notes;
}

function wordsPerSecond(delivery: ReplyDelivery): number | null {
  const seconds = delivery.measured.speechSeconds;
  return seconds >= 0.8 && delivery.words > 0 ? delivery.words / seconds : null;
}

/** A few lines describing how the reply sounded, or null if there is too little to go on. */
export function describeDelivery(delivery: ReplyDelivery): string | null {
  const m = delivery.measured;
  if (m.pitchHz == null || m.speechSeconds < 0.8) return null;

  const notes = delivery.baseline ? againstBaseline(delivery, delivery.baseline) : withoutBaseline(delivery);
  if (m.pauses > 0) {
    notes.push(
      `Pauses: ${m.pauses} noticeable pause${m.pauses > 1 ? "s" : ""}, the longest about ${m.longestPause.toFixed(1)} seconds.`,
    );
  }
  return notes.join("\n");
}
