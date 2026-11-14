"use client";

import { useState } from "react";
import { messageOf } from "@/lib/client/api";
import { useRecorder } from "@/lib/client/useRecorder";

type Props = {
  disabled: boolean;
  /** Called with the answer. Returns false if it was not sent. */
  onSend: (text: string) => boolean;
  /** Called when the person starts speaking, so the voice can stop. */
  onRecordStart: () => void;
  /** Called when the person types. */
  onType?: () => void;
  placeholder?: string;
  help?: string;
};

export function AnswerBox({
  disabled,
  onSend,
  onRecordStart,
  onType,
  placeholder = "How did it sound to you?",
  help = "Tap the microphone to speak, then check the words and send. Or just type.",
}: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recorder = useRecorder();
  const recording = recorder.status === "recording";
  const transcribing = recorder.status === "transcribing";

  const submit = () => {
    if (onSend(text)) {
      setText("");
      setError(null);
    }
  };

  const toggleMic = async () => {
    setError(null);
    try {
      if (recording) {
        const heard = await recorder.finish();
        if (heard) setText((current) => (current ? `${current} ${heard}` : heard));
        else setError("I didn't catch any words. Try again, or type your answer.");
      } else {
        onRecordStart();
        await recorder.start();
      }
    } catch (e) {
      setError(messageOf(e));
    }
  };

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
          className="min-h-12 w-full min-w-0 flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 leading-snug outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim() || recording || transcribing}
          className="h-12 shrink-0 rounded-xl bg-teal-700 px-4 font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {help}
        </p>
      )}
    </form>
  );
}
