"use client";

// Conversation mode. Rendered only in the browser (see ScenarioClient.tsx),
// because it starts from what is saved in this browser. See CONVERSATION-MODE.md.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { messageOf, postConversation } from "@/lib/client/api";
import { turnsSegments } from "@/lib/client/scenarioSpeech";
import { clearScenario, loadBaseline, loadScenario, saveScenario, type SavedScenario } from "@/lib/client/storage";
import { useVoice } from "@/lib/client/useVoice";
import { canHint, hintsThisTurn } from "@/lib/conversation";
import {
  HINTS_PER_TURN,
  type Baseline,
  type ConversationProgress,
  type ConversationRequest,
  type ConversationResponse,
  type ReplyDelivery,
  type Scenario,
} from "@/lib/types";
import { AnswerBox, type Spoken } from "./AnswerBox";
import { FitProgress } from "./FitProgress";
import { Notice } from "./Notice";
import { ScenarioTranscript, scenarioTurnKey } from "./ScenarioTranscript";
import { VoiceBaseline } from "./VoiceBaseline";

/** How long the person can stay quiet before the "Take your time" note. */
const NUDGE_AFTER_MS = 20_000;

const fresh = (): SavedScenario => ({ scenario: null, progress: { results: [] } });

type Waiting = "start" | "reply" | "hint" | null;
/** What went wrong, and what "Try again" should redo. */
type ErrorState = {
  message: string;
  retry?: { action: "start" } | { action: "reply"; text: string; delivery?: ReplyDelivery };
};

export default function ScenarioPractice() {
  const [saved, setSaved] = useState<SavedScenario>(() => loadScenario() ?? fresh());
  const [waiting, setWaiting] = useState<Waiting>(() => (saved.scenario ? null : "start"));
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [mock, setMock] = useState(false);
  // The reply turn ("<scenario id>:<exchanges>") the person started answering,
  // and the one the "Take your time" note was shown for.
  const [activeTurn, setActiveTurn] = useState<string | null>(null);
  const [nudgeTurn, setNudgeTurn] = useState<string | null>(null);
  // The person's normal voice, for tone feedback. The card asking for it shows
  // until they record it or choose "Not now" (asked again on the next visit).
  const [baseline, setBaseline] = useState<Baseline | null>(() => loadBaseline());
  const [askBaseline, setAskBaseline] = useState(() => baseline === null);

  const voice = useVoice();
  const { play, stop } = voice;

  // Bumped by Start again and Next scenario, so an answer about the old
  // scenario is dropped.
  const generation = useRef(0);
  const initial = useRef(saved);
  const started = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  const { scenario, progress } = saved;

  /** Sends a request and takes the scenario and progress the server returns. */
  const call = useCallback(
    async (request: ConversationRequest, before: Scenario | null): Promise<ConversationResponse | null> => {
      const gen = generation.current;
      const response = await postConversation(request);
      if (gen !== generation.current) return null;

      const next: SavedScenario = { scenario: response.scenario, progress: response.progress };
      setSaved(next);
      saveScenario(next);
      setMock(response.mock);

      // Play only the turns that are new since the last copy.
      const known = before && before.id === response.scenario.id ? before.turns.length : 0;
      const added = response.scenario.turns.slice(known);
      const firstSpoken = response.scenario.turns.findIndex((t, i) => i >= known && t.role !== "user");
      const segments = turnsSegments(added, response.scenario);
      if (segments.length && firstSpoken >= 0) {
        void play(segments, scenarioTurnKey(response.scenario, firstSpoken));
      }
      return response;
    },
    [play],
  );

  const startScenario = useCallback(
    async (currentProgress: ConversationProgress) => {
      setWaiting("start");
      setError(null);
      try {
        await call({ action: "start", progress: currentProgress }, null);
      } catch (e) {
        setError({ message: messageOf(e), retry: { action: "start" } });
      } finally {
        setWaiting(null);
      }
    },
    [call],
  );

  // On arrival with nothing saved, start the first scenario. Runs once.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!initial.current.scenario) void startScenario(initial.current.progress);
  }, [startScenario]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [scenario?.turns.length, pending, waiting]);

  const sendReply = async (text: string, delivery?: ReplyDelivery) => {
    if (!scenario) return;
    setPending(text);
    setWaiting("reply");
    setError(null);
    try {
      await call({ action: "reply", scenario, text, progress, ...(delivery ? { delivery } : {}) }, scenario);
      setPending(null);
    } catch (e) {
      setError({ message: messageOf(e), retry: { action: "reply", text, delivery } });
    } finally {
      setWaiting(null);
    }
  };

  const send = (text: string, spoken: Spoken | null): boolean => {
    const reply = text.trim();
    if (!reply || waiting || pending || !scenario || scenario.done) return false;
    stop();
    const delivery: ReplyDelivery | undefined = spoken
      ? { measured: spoken.delivery, words: spoken.words, baseline }
      : undefined;
    void sendReply(reply, delivery);
    return true;
  };

  const askHint = async () => {
    if (!scenario || !canHint(scenario) || waiting) return;
    setActiveTurn(turnId);
    stop();
    setWaiting("hint");
    setError(null);
    try {
      await call({ action: "hint", scenario, progress }, scenario);
    } catch (e) {
      setError({ message: messageOf(e) });
    } finally {
      setWaiting(null);
    }
  };

  const nextScenario = () => {
    generation.current++;
    stop();
    setPending(null);
    void startScenario(progress);
  };

  const restart = () => {
    if (progress.results.length > 0 && !window.confirm("Clear your Conversation progress and start a new scenario?")) {
      return;
    }
    generation.current++;
    stop();
    clearScenario();
    const next = fresh();
    setSaved(next);
    setPending(null);
    setMock(false);
    void startScenario(next.progress);
  };

  const retry = () => {
    const what = error?.retry;
    if (!what) return;
    if (what.action === "start") void startScenario(progress);
    else void sendReply(what.text, what.delivery);
  };

  const dismissError = () => {
    setError(null);
    setPending(null);
  };

  // --- "Take your time" note -------------------------------------------------
  const turnId = scenario ? `${scenario.id}:${scenario.exchanges}` : null;
  const myTurn = !!scenario && !scenario.done && !waiting && !pending;
  const quiet = voice.status === "idle" && !voice.blocked;

  useEffect(() => {
    if (!myTurn || !quiet || !turnId || activeTurn === turnId || nudgeTurn === turnId) return;
    const timer = window.setTimeout(() => setNudgeTurn(turnId), NUDGE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [myTurn, quiet, turnId, activeTurn, nudgeTurn]);

  const markActive = () => {
    if (turnId && activeTurn !== turnId) setActiveTurn(turnId);
  };
  const showNudge = myTurn && turnId !== null && nudgeTurn === turnId && activeTurn !== turnId;

  const hintsLeft = scenario ? HINTS_PER_TURN - hintsThisTurn(scenario) : 0;
  const hintAllowed = !!scenario && canHint(scenario) && myTurn;

  const hintButton = (
    <button
      type="button"
      onClick={() => void askHint()}
      disabled={!hintAllowed}
      className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-sky-800 ring-1 ring-sky-300 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-sky-200 dark:ring-sky-800 dark:hover:bg-sky-950"
    >
      {waiting === "hint" ? "Getting a hint…" : hintsLeft > 0 ? `Hint (${hintsLeft} left)` : "No hints left"}
    </button>
  );

  const progressSection = (
    <div className="flex flex-col gap-3">
      <FitProgress progress={progress} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={restart}
          disabled={waiting === "start"}
          className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-300 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
        >
          Start again
        </button>
        <button
          type="button"
          onClick={() => setAskBaseline(true)}
          disabled={askBaseline}
          className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-300 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
        >
          {baseline ? "Redo normal voice" : "Record normal voice"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="flex items-baseline gap-2">
            <Link href="/" className="font-semibold tracking-tight">
              InterpretTime
            </Link>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Conversation</span>
          </p>
          {scenario && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              <span className="font-medium">{scenario.title}</span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {" · "}
                {scenario.done ? "finished" : `reply ${Math.min(scenario.exchanges + 1, 3)} of 3`}
              </span>
            </p>
          )}
        </header>

        <details className="rounded-xl ring-1 ring-zinc-200 lg:hidden dark:ring-zinc-800">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Your progress in this mode</summary>
          <div className="px-4 pb-4">{progressSection}</div>
        </details>

        {mock && (
          <Notice tone="info">
            The AI is not connected, so this is a short scripted practice scenario. Add an ANTHROPIC_API_KEY
            to turn on the real one.
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

        {scenario && (
          <ScenarioTranscript
            scenario={scenario}
            pending={pending}
            voice={voice}
            onPlay={play}
            onStop={stop}
            onNext={nextScenario}
            nextDisabled={waiting !== null}
          />
        )}

        {waiting && waiting !== "hint" && (
          <p role="status" className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="size-2 animate-pulse rounded-full bg-teal-600" aria-hidden />
            {waiting === "start" ? "Setting the scene…" : "Thinking about your reply…"}
          </p>
        )}
        {error && (
          <Notice tone="error">
            <span className="flex flex-wrap items-center justify-between gap-3">
              {error.message}
              <span className="flex gap-2">
                {error.retry && (
                  <button
                    type="button"
                    onClick={retry}
                    className="rounded-lg bg-red-700 px-3 py-1.5 font-medium text-white hover:bg-red-800"
                  >
                    Try again
                  </button>
                )}
                {scenario && (
                  <button type="button" onClick={dismissError} className="rounded-lg px-3 py-1.5 font-medium underline">
                    {pending ? "Cancel" : "Dismiss"}
                  </button>
                )}
              </span>
            </span>
          </Notice>
        )}

        {askBaseline && scenario && (
          <VoiceBaseline
            redo={baseline !== null}
            onRecordStart={stop}
            onDone={(next) => {
              setBaseline(next);
              setAskBaseline(false);
            }}
            onSkip={() => setAskBaseline(false)}
          />
        )}

        {scenario && !scenario.done && (
          <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-zinc-200 bg-[var(--background)] px-4 pb-4 pt-3 sm:-mx-6 sm:px-6 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              {showNudge ? (
                <p role="status" className="text-sm text-sky-900 dark:text-sky-200">
                  Take your time. Want a hint?
                </p>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Reply to {scenario.characterName} as you would in real life.
                </p>
              )}
              {hintButton}
            </div>
            <AnswerBox
              disabled={!myTurn}
              onSend={send}
              onRecordStart={() => {
                markActive();
                stop();
              }}
              onType={markActive}
              placeholder={`Say something to ${scenario.characterName}…`}
              help="Tap the microphone to speak your reply and get feedback on your tone too. Or just type."
              checksTone
            />
          </div>
        )}
        {/* After the reply bar, so scrolling here shows the newest turn above it. */}
        <div ref={bottom} />
      </div>

      <aside className="hidden w-72 shrink-0 lg:sticky lg:top-4 lg:block">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Your progress in this mode
        </h2>
        {progressSection}
      </aside>
    </div>
  );
}
