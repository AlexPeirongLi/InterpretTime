"use client";

// "Your normal voice": the person reads a short passage so their spoken
// replies can be compared with how they usually sound (TONE-CHECK.md). If
// they agree, the same recording also makes a copy of their voice, so their
// own sentences can be played back in a better tone (YOUR-VOICE.md).

import { useEffect, useState } from "react";
import { deleteVoiceCopy, messageOf, postVoiceCopy } from "@/lib/client/api";
import { saveBaseline, saveVoiceCopy } from "@/lib/client/storage";
import { useRecorder } from "@/lib/client/useRecorder";
import type { Baseline } from "@/lib/types";

// About 1½-2 minutes read aloud: ElevenLabs suggests 1-2 minutes for a voice
// copy that sounds close. A mix of statements, questions and an exclamation
// gives it more of the person's natural range.
const PASSAGE = [
  "Today I'm going to practise a few short conversations, speaking in my normal, everyday voice.",
  "I'll read this the way I usually talk, not too fast and not too slow.",
  "In the mornings I like to have something warm to drink before I start the day.",
  "Sometimes I go for a walk if the weather is good, and sometimes I just stay in and read.",
  "At the weekend I might meet up with friends, cook something simple, or watch a film.",
  "It doesn't have to be anything special.",
  "I'm just reading this so the website can hear what my voice usually sounds like.",
  "Last week I tried a new recipe, and honestly, it didn't go to plan. The sauce was far too salty, so we ordered food instead.",
  "Have you ever had a day like that? Where nothing quite works, but it somehow turns out fine in the end?",
  "I like hearing about other people's plans too. Someone told me they were going camping by a lake, which sounded lovely.",
  "I'd probably forget the tent pegs, though!",
  "Reading out loud feels a bit strange at first, but it gets easier after a sentence or two.",
  "I'll keep going a little longer, so there's plenty of my voice to work with.",
  "That's nearly the end now. Thanks for listening.",
];
const PASSAGE_WORDS = PASSAGE.join(" ").split(/\s+/).length;
/** Less speech than this and the tone measurement is not worth keeping. */
const MIN_SPEECH_SECONDS = 2;
/** A voice copy needs more: roughly half the passage at least. */
const MIN_COPY_SECONDS = 40;

type Props = {
  /** True when a baseline is already saved and this is a redo. */
  redo: boolean;
  /** The voice copy made last time, replaced if a new one is made. */
  existingCopy: string | null;
  /** Start with the voice copy box ticked (when re-recording an existing copy). */
  copyByDefault?: boolean;
  /** Called when done. voiceCopy is the new copy's ID, or null if none was made. */
  onDone: (baseline: Baseline, voiceCopy: string | null) => void;
  onSkip: () => void;
  /** Called when recording starts, so the voice can stop. */
  onRecordStart: () => void;
};

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function VoiceBaseline({ redo, existingCopy, copyByDefault = false, onDone, onSkip, onRecordStart }: Props) {
  const recorder = useRecorder();
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(copyByDefault);
  const [making, setMaking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  // Set when the tone baseline worked but the voice copy didn't.
  const [savedWithoutCopy, setSavedWithoutCopy] = useState<Baseline | null>(null);
  const recording = recorder.status === "recording";

  useEffect(() => {
    if (!recording) return;
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.round((Date.now() - started) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [recording]);

  const toggle = async () => {
    setError(null);
    try {
      if (!recording) {
        setSeconds(0);
        setSavedWithoutCopy(null);
        onRecordStart();
        await recorder.start();
        return;
      }
      const { delivery, audio } = await recorder.finish({ transcribe: false });
      if (!delivery || delivery.pitchHz == null || delivery.speechSeconds < MIN_SPEECH_SECONDS) {
        setError("I couldn't hear that clearly enough. Try again a little closer to the microphone, somewhere quiet.");
        return;
      }
      const baseline: Baseline = { ...delivery, wordsPerSecond: PASSAGE_WORDS / delivery.speechSeconds };
      saveBaseline(baseline);

      if (!consent) {
        onDone(baseline, null);
        return;
      }
      if (delivery.speechSeconds < MIN_COPY_SECONDS || !audio) {
        setSavedWithoutCopy(baseline);
        setError(
          "Your normal voice is saved, but a voice copy needs more: read the whole passage, at least about 40 seconds of it.",
        );
        return;
      }
      setMaking(true);
      try {
        const { voiceId } = await postVoiceCopy(audio);
        // Only one copy per person: remove the old one.
        if (existingCopy && existingCopy !== voiceId) await deleteVoiceCopy(existingCopy).catch(() => undefined);
        saveVoiceCopy(voiceId);
        onDone(baseline, voiceId);
      } catch (e) {
        setSavedWithoutCopy(baseline);
        setError(`Your normal voice is saved, but the voice copy couldn't be made. ${messageOf(e)}`);
      } finally {
        setMaking(false);
      }
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
        <h2 className="font-semibold">
          {existingCopy ? "Re-record your voice copy" : redo ? "Record your normal voice again" : "Get feedback on your tone of voice"}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          When you speak a reply, I can also tell you how your voice came across. First I need to hear your normal
          voice. Tap record and read this out the way you usually talk. It takes about 1½ to 2 minutes. For a voice copy that sounds like you: somewhere quiet, the same distance from the microphone throughout, and read naturally, as if talking to a friend.
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-xl bg-white px-4 py-3 leading-relaxed dark:bg-zinc-950">
        {PASSAGE.map((sentence) => (
          <p key={sentence}>{sentence}</p>
        ))}
      </div>

      <label className="flex items-start gap-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={consent}
          disabled={recording || making}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-violet-700"
        />
        <span>
          Also make a copy of my voice with ElevenLabs, so I can hear my own sentences said in a better tone. It is only
          used to play my own sentences back to me, and I can delete it at any time.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={making}
          aria-pressed={recording}
          className={`rounded-xl px-4 py-2.5 font-medium text-white transition disabled:opacity-50 ${
            recording ? "animate-pulse bg-red-600" : "bg-violet-700 hover:bg-violet-800"
          }`}
        >
          {making ? "Making your voice copy…" : recording ? `■ Done reading (${clock(seconds)})` : "🎤 Record"}
        </button>
        {savedWithoutCopy && !recording && !making && (
          <button
            type="button"
            onClick={() => onDone(savedWithoutCopy, null)}
            className="rounded-xl px-4 py-2.5 text-sm font-medium ring-1 ring-violet-300 dark:ring-violet-800"
          >
            Continue without a voice copy
          </button>
        )}
        {!recording && !making && !savedWithoutCopy && (
          <button type="button" onClick={onSkip} className="rounded-xl px-4 py-2.5 text-sm text-zinc-700 underline dark:text-zinc-300">
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
          For tone feedback, only a few numbers about your voice are kept, in this browser. The recording is only sent
          anywhere if you tick the box above, to make the voice copy.
        </p>
      )}
    </section>
  );
}
