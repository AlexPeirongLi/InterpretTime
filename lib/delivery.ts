// Measures how a voice sounds from raw audio samples: pitch, how much the
// pitch moves, loudness, pauses and time spent speaking. See TONE-CHECK.md.
//
// Runs in the browser while the person speaks, so it works on small chunks as
// they arrive and keeps only a few numbers per 20 ms of audio. It is plain
// TypeScript with no imports at runtime, so it can also be tested with Node.

import type { Delivery } from "./types";

/** Audio is reduced to about this rate first: plenty for a voice, and fast. */
const TARGET_RATE = 16000;
const FRAME_SECONDS = 0.04;
const HOP_SECONDS = 0.02;
/** Pitch range searched: covers low and high speaking voices. */
const MIN_PITCH = 70;
const MAX_PITCH = 400;
/** Lower finds pitch more strictly (fewer mistakes, more frames skipped). */
const PITCH_THRESHOLD = 0.15;
const PAUSE_SECONDS = 0.5;
/** Fewer frames with a pitch than this (0.2 s) and pitch is not reported. */
const MIN_VOICED_FRAMES = 10;
/** Quieter than this is never treated as speech. */
const SILENT_DB = -65;

const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[index];
}

const semitones = (high: number, low: number) => 12 * Math.log2(high / low);

/**
 * The pitch of one frame in Hz, or NaN if it has no clear pitch (silence,
 * breath, noise). Uses the YIN method: find the shortest delay at which the
 * frame best matches a shifted copy of itself.
 */
function framePitch(frame: Float32Array, rate: number): number {
  const minLag = Math.floor(rate / MAX_PITCH);
  const maxLag = Math.min(Math.ceil(rate / MIN_PITCH), Math.floor(frame.length / 2));
  const width = frame.length - maxLag;
  const diff = new Float32Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < width; i++) {
      const d = frame[i] - frame[i + lag];
      sum += d * d;
    }
    diff[lag] = sum;
  }
  // Normalise so the threshold works at any loudness.
  let running = 0;
  const norm = new Float32Array(maxLag + 1);
  norm[0] = 1;
  for (let lag = 1; lag <= maxLag; lag++) {
    running += diff[lag];
    norm[lag] = running === 0 ? 1 : (diff[lag] * lag) / running;
  }
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (norm[lag] < PITCH_THRESHOLD) {
      while (lag + 1 <= maxLag && norm[lag + 1] < norm[lag]) lag++;
      // Refine between samples for a smoother estimate.
      const a = norm[lag - 1] ?? norm[lag];
      const b = norm[lag];
      const c = norm[lag + 1] ?? norm[lag];
      const bend = a - 2 * b + c;
      const shift = bend === 0 ? 0 : (a - c) / (2 * bend);
      return rate / (lag + shift);
    }
  }
  return NaN;
}

function frameDb(frame: Float32Array): number {
  let sum = 0;
  for (const s of frame) sum += s * s;
  return 20 * Math.log10(Math.sqrt(sum / frame.length) + 1e-10);
}

/** Measures a voice from audio that arrives in chunks, e.g. from a microphone. */
export class DeliveryMeter {
  readonly sampleRate: number;
  #factor: number;
  #rate: number;
  #frameLength: number;
  #hop: number;
  // Samples being averaged into one reduced sample.
  #accSum = 0;
  #accCount = 0;
  // Reduced samples not yet covered by a full frame.
  #pending: number[] = [];
  #totalSamples = 0;
  #db: number[] = [];
  #pitch: number[] = [];

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.#factor = Math.max(1, Math.round(sampleRate / TARGET_RATE));
    this.#rate = sampleRate / this.#factor;
    this.#frameLength = Math.round(this.#rate * FRAME_SECONDS);
    this.#hop = Math.round(this.#rate * HOP_SECONDS);
  }

  /** Adds the next chunk of audio (mono samples between -1 and 1). */
  push(samples: Float32Array): void {
    this.#totalSamples += samples.length;
    for (const s of samples) {
      this.#accSum += s;
      if (++this.#accCount === this.#factor) {
        this.#pending.push(this.#accSum / this.#factor);
        this.#accSum = 0;
        this.#accCount = 0;
      }
    }
    while (this.#pending.length >= this.#frameLength) {
      const frame = Float32Array.from(this.#pending.slice(0, this.#frameLength));
      this.#db.push(frameDb(frame));
      this.#pitch.push(framePitch(frame, this.#rate));
      this.#pending.splice(0, this.#hop);
    }
  }

  /** The measurements so far. */
  result(): Delivery {
    const seconds = round(this.#totalSamples / this.sampleRate);
    const db = this.#db;
    const nothing: Delivery = {
      seconds,
      speechSeconds: 0,
      pitchHz: null,
      pitchRange: null,
      loudnessDb: -100,
      loudnessRange: 0,
      pauses: 0,
      longestPause: 0,
    };
    if (db.length === 0) return nothing;

    // Speech is anything clearly above the quietest part of the recording.
    // When there is little difference (no silence in it at all), most of it
    // counts as speech. Below SILENT_DB nothing counts.
    const loudest = percentile(db, 95);
    const quietest = percentile(db, 10);
    const threshold = Math.max(loudest - 30, Math.min(quietest + 3, loudest - 6), SILENT_DB);
    const speech = db.map((d) => d > threshold);
    const speechDb = db.filter((_, i) => speech[i]);
    if (speechDb.length === 0) return nothing;

    // Pitch from speech frames only, ignoring outliers (octave mistakes).
    let pitches = this.#pitch.filter((p, i) => speech[i] && Number.isFinite(p));
    let pitchHz: number | null = null;
    let pitchRange: number | null = null;
    if (pitches.length >= MIN_VOICED_FRAMES) {
      const middle = percentile(pitches, 50);
      pitches = pitches.filter((p) => p > middle / 1.8 && p < middle * 1.8);
      pitchHz = round(percentile(pitches, 50), 1);
      pitchRange = round(semitones(percentile(pitches, 90), percentile(pitches, 10)), 1);
    }

    // Pauses: quiet stretches between the first and last bit of speech.
    const first = speech.indexOf(true);
    const last = speech.lastIndexOf(true);
    let pauses = 0;
    let longest = 0;
    let run = 0;
    for (let i = first; i <= last && first >= 0; i++) {
      if (speech[i]) {
        const length = run * HOP_SECONDS;
        if (length >= PAUSE_SECONDS) pauses++;
        longest = Math.max(longest, length);
        run = 0;
      } else {
        run++;
      }
    }

    return {
      seconds,
      speechSeconds: round(speechDb.length * HOP_SECONDS),
      pitchHz,
      pitchRange,
      loudnessDb: round(percentile(speechDb, 50), 1),
      loudnessRange: round(percentile(speechDb, 90) - percentile(speechDb, 10), 1),
      pauses,
      longestPause: round(longest >= PAUSE_SECONDS ? longest : 0),
    };
  }
}

/** Measures a whole recording at once. */
export function measure(samples: Float32Array, sampleRate: number): Delivery {
  const meter = new DeliveryMeter(sampleRate);
  meter.push(samples);
  return meter.result();
}
