"use client";

// Conversation mode. Rendered only in the browser (see ScenarioClient.tsx),
// because it starts from what is saved in this browser. See CONVERSATION-MODE.md.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { deleteVoiceCopy, messageOf, postConversation } from "@/lib/client/api";
import { turnsSegments } from "@/lib/client/scenarioSpeech";
import {
  clearScenario,
  loadBaseline,
  loadVoiceCopy,
  loadEmotionSet,
  loadLength,
  saveEmotionSet,
  loadScenario,
  saveLength,
  saveScenario,
  saveVoiceCopy,
  type SavedScenario,
} from "@/lib/client/storage";
import { useVoice } from "@/lib/client/useVoice";
import { canHint, hintsThisTurn, repliesFor } from "@/lib/conversation";
import {
  HINTS_PER_TURN,
  type Baseline,
  type ConversationLength,
  type EmotionSet,
  type ConversationProgress,
  type ConversationRequest,
  type ConversationResponse,
  type ReplyDelivery,
  type Scenario,
} from "@/lib/types";
import { AnswerBox, type Spoken } from "./AnswerBox";
import { readyForDeeperConversation } from "@/lib/client/progress";
import { EmotionSetPicker } from "./EmotionSetPicker";
import { FitProgress } from "./FitProgress";
import { LengthPicker } from "./LengthPicker";
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
  retry?: { action: "start"; length: ConversationLength } | { action: "reply"; text: string; delivery?: ReplyDelivery };
};

export default function ScenarioPractice() {
  const [saved, setSaved] = useState<SavedScenario>(() => loadScenario() ?? fresh());
  const [waiting, setWaiting] = useState<Waiting>(null);
  // Choosing how long the next conversation lasts: at the very start, and
  // after each review.
  const [choosing, setChoosing] = useState(() => saved.scenario === null);
  // Coming back to an unfinished conversation: ask whether to resume it or
  // start a new one, instead of carrying on without asking.
  const [resuming, setResuming] = useState(() => saved.scenario !== null && !saved.scenario.done);
  const [lastLength, setLastLength] = useState<ConversationLength>(() => loadLength() ?? "medium");
  // Start recording by itself once the voice has finished talking.
  const [autoRecordOn, setAutoRecordOn] = useState(true);
  // The clip that, when it ends, should start the recording (the newest lines).
  const [autoKey, setAutoKey] = useState<string | null>(null);
  // Changing the switch forgets the clip waiting for it, so turning it on
  // never starts a recording for a voice that already finished.
  const changeAutoRecord = (on: boolean) => {
    setAutoRecordOn(on);
    setAutoKey(null);
  };
  // Which emotions the next conversation uses. Chosen next to the length.
  const [emotionSet, setEmotionSet] = useState<EmotionSet>(() => loadEmotionSet());
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const changeEmotionSet = (set: EmotionSet) => {
    setEmotionSet(set);
    saveEmotionSet(set);
  };
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  // The reply turn ("<scenario id>:<exchanges>") the person started answering,
  // and the one the "Take your time" note was shown for.
  const [activeTurn, setActiveTurn] = useState<string | null>(null);
  const [nudgeTurn, setNudgeTurn] = useState<string | null>(null);
  // The person's normal voice, for tone feedback. The card asking for it opens
  // only when they choose it, from the link under the reply box.
  const [baseline, setBaseline] = useState<Baseline | null>(() => loadBaseline());
  const [askBaseline, setAskBaseline] = useState(false);
  // A copy of the person's voice, made only with their consent (YOUR-VOICE.md).
  const [voiceCopy, setVoiceCopy] = useState<string | null>(() => loadVoiceCopy());
  const [voiceCopyError, setVoiceCopyError] = useState<string | null>(null);
  // The person's own spoken replies this visit, by "<scenario id>:<reply number>",
  // so they can be played next to the better version. Not saved: they are audio.
  const recordings = useRef(new Map<string, string>());
  const [showProgress, setShowProgress] = useState(false);

  const voice = useVoice();
  const { play, playRecording, stop } = voice;

  // Bumped by Start again and Next scenario, so an answer about the old
  // scenario is dropped.
  const generation = useRef(0);
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

      // Play only the turns that are new since the last copy.
      const known = before && before.id === response.scenario.id ? before.turns.length : 0;
      const added = response.scenario.turns.slice(known);
      const firstSpoken = response.scenario.turns.findIndex((t, i) => i >= known && t.role !== "user");
      const segments = turnsSegments(added, response.scenario);
      if (segments.length && firstSpoken >= 0) {
        const key = scenarioTurnKey(response.scenario, firstSpoken);
        setAutoKey(response.scenario.done ? null : key);
        void play(segments, key);
      }
      return response;
    },
    [play],
  );

  const startScenario = async (currentProgress: ConversationProgress, length: ConversationLength) => {
    setWaiting("start");
    setError(null);
    try {
      await call({ action: "start", progress: currentProgress, length, emotionSet }, null);
    } catch (e) {
      setError({ message: messageOf(e), retry: { action: "start", length } });
    } finally {
      setWaiting(null);
    }
  };

  const pickLength = (length: ConversationLength) => {
    saveLength(length);
    setLastLength(length);
  };

  const beginScenario = () => {
    saveLength(lastLength);
    setChoosing(false);
    void startScenario(progress, lastLength);
  };

  /** Resume: play where the conversation is up to (the scene, and the character's latest lines). */
  const resume = () => {
    setResuming(false);
    const current = scenario;
    if (!current || current.done) return;
    const from = current.turns.findLastIndex((t) => t.role === "user") + 1;
    const spoken = current.turns.slice(from).filter((t) => t.role === "narrator" || t.role === "character");
    const first = current.turns.findIndex((t, i) => i >= from && (t.role === "narrator" || t.role === "character"));
    const segments = turnsSegments(spoken, current);
    if (segments.length && first >= 0) {
      const key = scenarioTurnKey(current, first);
      setAutoKey(key);
      void play(segments, key);
    }
  };

  /** Start a new conversation: drops the unfinished one, keeps progress. */
  const startNew = () => {
    generation.current++;
    stop();
    setPending(null);
    setError(null);
    const next: SavedScenario = { scenario: null, progress };
    setSaved(next);
    saveScenario(next);
    setResuming(false);
    setChoosing(true);
  };

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
    if (spoken?.audio) {
      recordings.current.set(`${scenario.id}:${scenario.exchanges + 1}`, URL.createObjectURL(spoken.audio));
    }
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
    setChoosing(true);
  };

  const removeVoiceCopy = async () => {
    if (!voiceCopy) return;
    if (!window.confirm("Delete the copy of your voice from ElevenLabs? This can't be undone. You can make a new one any time.")) return;
    setVoiceCopyError(null);
    try {
      await deleteVoiceCopy(voiceCopy);
      saveVoiceCopy(null);
      setVoiceCopy(null);
    } catch (e) {
      setVoiceCopyError(messageOf(e));
    }
  };

  const restart = () => {
    if (progress.results.length > 0 && !window.confirm("Clear your Conversation progress and start a new scenario?")) {
      return;
    }
    generation.current++;
    stop();
    clearScenario();
    setSaved(fresh());
    setPending(null);
    setError(null);
    setChoosing(true);
  };

  const retry = () => {
    const what = error?.retry;
    if (!what) return;
    if (what.action === "start") void startScenario(progress, what.length);
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
      className="shrink-0 py-1 text-sm font-medium text-sky-800 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40 dark:text-sky-200"
    >
      {waiting === "hint" ? "Getting a hint…" : hintsLeft > 0 ? `Hint (${hintsLeft} left)` : "No hints left"}
    </button>
  );

  const progressSection = (
    <div className="flex flex-col gap-3">
      <FitProgress progress={progress} emotionSet={scenario?.emotionSet ?? emotionSet} />
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
          onClick={() => {
            setAskBaseline(true);
            setShowProgress(false);
          }}
          disabled={askBaseline || choosing}
          className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-300 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
        >
          {baseline ? "Redo my normal voice" : "Set up tone feedback"}
        </button>
        {voiceCopy && (
          <button
            type="button"
            onClick={() => void removeVoiceCopy()}
            className="rounded-lg px-3 py-1.5 text-sm text-red-700 ring-1 ring-red-300 hover:bg-red-50 dark:text-red-300 dark:ring-red-900 dark:hover:bg-red-950/40"
          >
            Delete my voice copy
          </button>
        )}
      </div>
      {voiceCopyError && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {voiceCopyError}
        </p>
      )}
    </div>
  );

  // The way into tone feedback and the voice copy, shown until both are set up.
  const setupLabel =
    baseline === null
      ? "Set up tone feedback (optional)"
      : voiceCopy === null
        ? "Hear your replies in your own voice (set up)"
        : null;

  const total = scenario ? repliesFor(scenario) : 0;
  const step = scenario ? (scenario.done ? total : Math.min(scenario.exchanges + 1, total)) : 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-4 sm:px-6">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="font-semibold tracking-tight">
            InterpretTime
          </Link>
          <button
            type="button"
            onClick={() => setShowProgress((open) => !open)}
            aria-expanded={showProgress}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Progress
          </button>
        </header>

        {showProgress && (
          <section aria-label="Your progress" className="rounded-xl p-4 ring-1 ring-zinc-200 dark:ring-zinc-800">
            {progressSection}
          </section>
        )}

        {scenario && !choosing && (
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <span className="flex gap-1.5" aria-hidden>
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-7 rounded-full ${i < step ? "bg-teal-700 dark:bg-teal-400" : "bg-zinc-300 dark:bg-zinc-700"}`}
                />
              ))}
            </span>
            <span>{scenario.done ? "Finished" : `Reply ${step} of ${total}`}</span>
          </div>
        )}

        {voice.blocked && (
          <Notice tone="info">
            <span className="flex flex-wrap items-center justify-between gap-3">
              Your browser is waiting for a tap before it plays sound. Tap anywhere to hear it.
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

        {resuming && scenario ? (
          <section
            aria-label="Unfinished conversation"
            className="flex flex-col gap-4 rounded-2xl p-5 ring-1 ring-zinc-200 dark:ring-zinc-800"
          >
            <div>
              <h2 className="text-lg font-semibold">Welcome back</h2>
              <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                You were in the middle of <span className="font-medium">{scenario.title}</span>, reply {step} of {total}.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={resume}
                className="rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white transition hover:bg-teal-800"
              >
                Resume where I left off
              </button>
              <button
                type="button"
                onClick={startNew}
                className="rounded-xl px-5 py-3 font-medium ring-1 ring-zinc-300 transition hover:bg-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-800"
              >
                Start a new conversation
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Starting a new one keeps your progress. Only this unfinished conversation is dropped.
            </p>
          </section>
        ) : choosing ? (
          <div className="flex flex-col gap-5">
            {emotionSet === "basics" && !suggestionDismissed && readyForDeeperConversation(progress) && (
              <Notice tone="info">
                <span className="flex flex-wrap items-center justify-between gap-3">
                  You&apos;re replying in tune to most of the basic emotions. Want to try deeper ones, like sarcasm?
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => changeEmotionSet("both")}
                      className="rounded-lg bg-sky-700 px-3 py-1.5 font-medium text-white hover:bg-sky-800"
                    >
                      Add deeper emotions
                    </button>
                    <button type="button" onClick={() => setSuggestionDismissed(true)} className="px-2 py-1.5 underline">
                      Not now
                    </button>
                  </span>
                </span>
              </Notice>
            )}
            <EmotionSetPicker value={emotionSet} onChange={changeEmotionSet} disabled={waiting !== null} />
            <LengthPicker last={lastLength} disabled={waiting !== null} onPick={pickLength} />
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={beginScenario}
                disabled={waiting !== null}
                className="rounded-xl bg-teal-700 px-5 py-4 text-lg font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
              >
                Start scenario
              </button>
              <label className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={autoRecordOn}
                  onChange={(event) => changeAutoRecord(event.target.checked)}
                  className="mt-0.5 size-4 accent-teal-700"
                />
                Start recording my reply when the voice stops talking
              </label>
              {setupLabel && !askBaseline && (
                <button
                  type="button"
                  onClick={() => setAskBaseline(true)}
                  className="self-start py-1 text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-300"
                >
                  {setupLabel}
                </button>
              )}
            </div>
          </div>
        ) : (
          scenario && (
            <ScenarioTranscript
              scenario={scenario}
              pending={pending}
              voice={voice}
              onPlay={play}
              onStop={stop}
              onPlayRecording={playRecording}
              voiceCopy={voiceCopy}
              recordingFor={(n) => recordings.current.get(`${scenario.id}:${n}`) ?? null}
              onNext={nextScenario}
              nextDisabled={waiting !== null}
            />
          )
        )}

        {waiting && waiting !== "hint" && (
          <p role="status" className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="size-2 animate-pulse rounded-full bg-teal-600" aria-hidden />
            {waiting === "start"
              ? "Setting the scene…"
              : scenario && scenario.exchanges + 1 >= repliesFor(scenario)
                ? "Writing your review…"
                : `${scenario?.characterName ?? "They"} is thinking…`}
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

        {askBaseline && !resuming && (
          <VoiceBaseline
            redo={baseline !== null}
            existingCopy={voiceCopy}
            onRecordStart={stop}
            onDone={(next, copy) => {
              setBaseline(next);
              if (copy) setVoiceCopy(copy);
              setAskBaseline(false);
            }}
            onSkip={() => setAskBaseline(false)}
          />
        )}

        {scenario && !scenario.done && !choosing && !resuming && (
          <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-zinc-200 bg-[var(--background)] px-4 pb-4 pt-3 sm:-mx-6 sm:px-6 dark:border-zinc-800">
            <AnswerBox
              disabled={!myTurn}
              onSend={send}
              onRecordStart={() => {
                markActive();
                stop();
              }}
              onType={markActive}
              placeholder={`Say something to ${scenario.characterName}…`}
              help=""
              checksTone
              autoRecordToken={autoRecordOn && autoKey && voice.endedKey === autoKey ? `${autoKey}:${voice.endedCount}` : null}
              onAutoRecordStarted={() => setAutoKey(null)}
            />
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              {hintButton}
              <button
                type="button"
                onClick={() => changeAutoRecord(!autoRecordOn)}
                aria-pressed={autoRecordOn}
                className="py-1 text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
              >
                Auto-record: {autoRecordOn ? "on" : "off"}
              </button>
              {showNudge ? (
                <p role="status" className="text-sm text-sky-900 dark:text-sky-200">
                  Take your time. Want a hint?
                </p>
              ) : (
                setupLabel &&
                !askBaseline && (
                  <button
                    type="button"
                    onClick={() => setAskBaseline(true)}
                    className="py-1 text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
                  >
                    {setupLabel}
                  </button>
                )
              )}
            </div>
          </div>
        )}
        {/* After the reply bar, so scrolling here shows the newest turn above it. */}
        <div ref={bottom} />
      </div>

    </div>
  );
}
