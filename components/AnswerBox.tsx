"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { messageOf } from "@/lib/client/api";
import { useRecorder } from "@/lib/client/useRecorder";
import type { Delivery } from "@/lib/types";

/** How a spoken answer sounded, and how many words were in that recording. */
export type Spoken = {
  delivery: Delivery;
  words: number;
  /** The recording itself, so it can be played back next to a better version. */
  audio: Blob | null;
};

type Props = {
  disabled: boolean;
  /**
   * Called with the answer, and how it sounded if it was spoken and the voice
   * could be measured. Returns false if it was not sent.
   */
  onSend: (text: string, spoken: Spoken | null) => boolean;
  /** Called when the person starts speaking, so the voice can stop. */
  onRecordStart: () => void;
  /** Called when the person types. */
  onType?: () => void;
  placeholder?: string;
  help?: string;
  /** Tell the person when their tone could not be measured (conversation mode). */
  checksTone?: boolean;
  /**
   * When this changes to a new value, recording starts by itself (once the box
   * is enabled). Used to start recording after the voice has finished talking.
   */
  autoRecordToken?: string | null;
  /** Called when a recording started this way, so the parent can clear the token. */
  onAutoRecordStarted?: () => void;
};

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

export function AnswerBox({
  disabled,
  onSend,
  onRecordStart,
  onType,
  placeholder = "How did it sound to you?",
  help = "Tap the microphone to speak, then check the words and send. Or just type.",
  checksTone = false,
  autoRecordToken = null,
  onAutoRecordStarted,
}: Props) {
  const [text, setText] = useState("");
  const [spoken, setSpoken] = useState<Spoken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const recorder = useRecorder();
  const recording = recorder.status === "recording";
  const transcribing = recorder.status === "transcribing";

  const submit = () => {
    if (onSend(text, text.trim() ? spoken : null)) {
      setText("");
      setSpoken(null);
      setError(null);
      setNote(null);
    }
  };

  const toggleMic = async () => {
    setError(null);
    setNote(null);
    try {
      if (recording) {
        const { text: heard, delivery, audio } = await recorder.finish();
        if (!heard) {
          setError("I didn't catch any words. Try again, or type your answer.");
          return;
        }
        setText((current) => (current ? `${current} ${heard}` : heard));
        // The latest recording is the one the tone feedback is about.
        if (delivery?.pitchHz != null) {
          setSpoken({ delivery, words: countWords(heard), audio });
        } else if (checksTone) {
          setNote("I couldn't hear your tone clearly that time, so the feedback will be on your words only.");
        }
      } else {
        onRecordStart();
        await recorder.start();
      }
    } catch (e) {
      setError(messageOf(e));
    }
  };

  const handledToken = useRef<string | null>(null);
  const beginAutoRecord = useEffectEvent((token: string) => {
    if (recording || transcribing) return;
    handledToken.current = token;
    onAutoRecordStarted?.();
    void toggleMic();
  });
  useEffect(() => {
    if (!autoRecordToken || disabled || handledToken.current === autoRecordToken) return;
    beginAutoRecord(autoRecordToken);
  }, [autoRecordToken, disabled]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="answer" className="sr-only">
        Your answer
      </label>
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={toggleMic}
          disabled={transcribing}
          aria-pressed={recording}
          aria-label={recording ? "Stop recording" : "Record your answer"}
          className={`flex size-12 shrink-0 items-center justify-center rounded-full text-xl transition disabled:opacity-50 ${
            recording
              ? "animate-pulse bg-red-600 text-white"
              : "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          }`}
        >
          <span aria-hidden>{recording ? "■" : "🎤"}</span>
        </button>
        <textarea
          id="answer"
          rows={1}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (!event.target.value.trim()) setSpoken(null);
            onType?.();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={
            recording ? "Listening… tap ■ when you're done" : transcribing ? "Writing down what you said…" : placeholder
          }
          className="min-h-12 w-full min-w-0 flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 leading-snug outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/30 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim() || recording || transcribing}
          className="h-12 shrink-0 rounded-xl bg-orange-700 px-4 font-medium text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : note ? (
        <p role="status" className="text-sm text-amber-800 dark:text-amber-200">
          {note}
        </p>
      ) : checksTone && spoken ? (
        <p className="text-xs text-orange-800 dark:text-orange-300">
          Your tone was measured. Check the words, then send.
        </p>
      ) : help ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{help}</p>
      ) : null}
    </form>
  );
}
