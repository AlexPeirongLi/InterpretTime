"use client";

// "Your normal voice": the person reads one plain sentence so their spoken
// replies can be compared with how they usually sound. See TONE-CHECK.md.

import { useState } from "react";
import { messageOf } from "@/lib/client/api";
import { saveBaseline } from "@/lib/client/storage";
import { useRecorder } from "@/lib/client/useRecorder";
import type { Baseline } from "@/lib/types";

const SENTENCE =
  "Today I'm going to practise a few short conversations, speaking in my normal, everyday voice.";
const SENTENCE_WORDS = SENTENCE.split(/\s+/).length;
/** Less speech than this and the measurement is not worth keeping. */
const MIN_SPEECH_SECONDS = 2;

type Props = {
  /** True when a baseline is already saved and this is a redo. */
  redo: boolean;
  onDone: (baseline: Baseline) => void;
  onSkip: () => void;
  /** Called when recording starts, so the voice can stop. */
  onRecordStart: () => void;
};

export function VoiceBaseline({ redo, onDone, onSkip, onRecordStart }: Props) {
  const recorder = useRecorder();
  const [error, setError] = useState<string | null>(null);
  const recording = recorder.status === "recording";

  const toggle = async () => {
    setError(null);
    try {
      if (!recording) {
        onRecordStart();
        await recorder.start();
        return;
      }
      const { delivery } = await recorder.finish({ transcribe: false });
      if (!delivery || delivery.pitchHz == null || delivery.speechSeconds < MIN_SPEECH_SECONDS) {
        setError(
          "I couldn't hear that clearly enough. Try reading the whole sentence again, a little closer to the microphone, somewhere quiet.",
        );
        return;
      }
      const baseline: Baseline = { ...delivery, wordsPerSecond: SENTENCE_WORDS / delivery.speechSeconds };
      saveBaseline(baseline);
      onDone(baseline);
    } catch (e) {
      setError(messageOf(e));
    }
  };

  return (
    <section
      aria-label="Record your normal voice"
      className="flex flex-col gap-3 rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:ring-violet-900"
    >
      <div>
        <h2 className="font-semibold">{redo ? "Record your normal voice again" : "Get feedback on your tone of voice"}</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          When you speak a reply, I can also tell you how your voice came across. First I need to hear your
          normal voice, so I have something to compare with. Tap record and read this out the way you usually
          talk:
        </p>
      </div>
      <p className="rounded-xl bg-white px-4 py-3 text-lg leading-snug dark:bg-zinc-950">“{SENTENCE}”</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void toggle()}
          aria-pressed={recording}
          className={`rounded-xl px-4 py-2.5 font-medium text-white transition ${
            recording ? "animate-pulse bg-red-600" : "bg-violet-700 hover:bg-violet-800"
          }`}
        >
          {recording ? "■ Done reading" : "🎤 Record"}
        </button>
        {!recording && (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-xl px-4 py-2.5 text-sm text-zinc-700 underline dark:text-zinc-300"
          >
            {redo ? "Cancel" : "Not now"}
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Only a few numbers about your voice are kept, in this browser. The recording itself is not saved.
        </p>
      )}
    </section>
  );
}
