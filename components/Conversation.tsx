"use client";

// The conversation page. Rendered only in the browser (see TalkClient.tsx),
// because it starts from what is saved in this browser.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { messageOf, postChat } from "@/lib/client/api";
import { clearConversation, loadConversation, saveConversation, type Saved } from "@/lib/client/storage";
import { useVoice } from "@/lib/client/useVoice";
import { emptyProfile } from "@/lib/profile";
import type { Profile, Turn } from "@/lib/types";
import { AnswerBox } from "./AnswerBox";
import { Notice } from "./Notice";
import { ProfilePanel } from "./ProfilePanel";
import { Transcript, turnKey } from "./Transcript";

const fresh = (): Saved => ({ history: [], profile: emptyProfile() });

/** True when it is the AI's turn to speak. */
const needsReply = (history: Turn[]) => history.length === 0 || history.at(-1)?.role === "user";

export default function Conversation() {
  const [saved, setSaved] = useState<Saved>(() => loadConversation() ?? fresh());
  const [waiting, setWaiting] = useState(() => needsReply(saved.history));
  const [chatError, setChatError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const voice = useVoice();
  const { play, stop } = voice;

  // Bumped by "Start again", so a reply to the old conversation is dropped.
  const generation = useRef(0);
  const initial = useRef(saved);
  const started = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  const requestReply = useCallback(
    async (history: Turn[], profile: Profile) => {
      const gen = generation.current;
      try {
        const response = await postChat({ history, profile });
        if (gen !== generation.current) return;
        const next: Saved = { history: [...history, response.reply], profile: response.profile };
        setSaved(next);
        saveConversation(next);
        setMock(response.mock);
        setWaiting(false);
        void play(response.reply.segments, turnKey(history.length));
      } catch (error) {
        if (gen !== generation.current) return;
        setChatError(messageOf(error));
        setWaiting(false);
      }
    },
    [play],
  );

  // On arrival: if it is the AI's turn (a new conversation, or a reload while
  // it was answering), ask for its turn. Runs once, even in development.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (needsReply(initial.current.history)) {
      void requestReply(initial.current.history, initial.current.profile);
    }
  }, [requestReply]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [saved.history.length, waiting]);

  const send = (text: string): boolean => {
    const answer = text.trim();
    if (!answer || waiting) return false;
    stop();
    const history: Turn[] = [...saved.history, { role: "user", text: answer }];
    const next: Saved = { history, profile: saved.profile };
    setSaved(next);
    saveConversation(next);
    setChatError(null);
    setWaiting(true);
    void requestReply(history, saved.profile);
    return true;
  };

  const retry = () => {
    setChatError(null);
    setWaiting(true);
    void requestReply(saved.history, saved.profile);
  };

  const restart = () => {
    if (
      saved.history.length > 1 &&
      !window.confirm("Start a new conversation? What you have practised so far will be cleared.")
    ) {
      return;
    }
    generation.current++;
    stop();
    clearConversation();
    const next = fresh();
    setSaved(next);
    setChatError(null);
    setMock(false);
    setWaiting(true);
    void requestReply(next.history, next.profile);
  };

  const stuck = chatError !== null && needsReply(saved.history);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <p className="flex items-baseline gap-2">
            <Link href="/" className="font-semibold tracking-tight">
              InterpretTime
            </Link>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Quickfire</span>
          </p>
          <button
            type="button"
            onClick={restart}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Start again
          </button>
        </header>

        <details className="rounded-xl ring-1 ring-zinc-200 lg:hidden dark:ring-zinc-800">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">What you recognise so far</summary>
          <div className="px-4 pb-4">
            <ProfilePanel profile={saved.profile} />
          </div>
        </details>

        {mock && (
          <Notice tone="info">
            The AI is not connected, so this is a short scripted practice conversation. Add an
            ANTHROPIC_API_KEY to turn on the real one.
          </Notice>
        )}
        {voice.unavailable && (
          <Notice tone="warn">Voice is not set up yet, so you can only read the conversation for now.</Notice>
        )}
        {voice.blocked && (
          <Notice tone="info">
            <span className="flex flex-wrap items-center justify-between gap-3">
              Your browser is waiting for a tap before it plays sound.
              <button
                type="button"
                onClick={() => voice.blocked && void play(voice.blocked.segments, voice.blocked.key)}
                className="rounded-lg bg-sky-700 px-3 py-1.5 font-medium text-white hover:bg-sky-800"
              >
                ▶ Play
              </button>
            </span>
          </Notice>
        )}
        {voice.error && <Notice tone="warn">{voice.error} You can still read the conversation.</Notice>}

        <Transcript history={saved.history} voice={voice} onPlay={play} onStop={stop} />

        {waiting && (
          <p role="status" className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="size-2 animate-pulse rounded-full bg-teal-600" aria-hidden />
            {saved.history.length === 0 ? "Getting ready…" : "Thinking…"}
          </p>
        )}
        {chatError && (
          <Notice tone="error">
            <span className="flex flex-wrap items-center justify-between gap-3">
              {chatError}
              {stuck && (
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-lg bg-red-700 px-3 py-1.5 font-medium text-white hover:bg-red-800"
                >
                  Try again
                </button>
              )}
            </span>
          </Notice>
        )}

        <div ref={bottom} />

        <div className="sticky bottom-0 -mx-4 border-t border-zinc-200 bg-[var(--background)] px-4 pb-4 pt-3 sm:-mx-6 sm:px-6 dark:border-zinc-800">
          <AnswerBox disabled={waiting || stuck} onSend={send} onRecordStart={stop} />
        </div>
      </div>

      <aside className="hidden w-72 shrink-0 lg:sticky lg:top-4 lg:block">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          What you recognise so far
        </h2>
        <ProfilePanel profile={saved.profile} />
      </aside>
    </div>
  );
}
