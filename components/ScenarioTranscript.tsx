import { FIT_LABELS } from "@/lib/client/progress";
import { turnSegments } from "@/lib/client/scenarioSpeech";
import type { VoiceState } from "@/lib/client/useVoice";
import type { Feedback, Fit, Scenario, SpeakRequest } from "@/lib/types";
import { EmotionChip } from "./EmotionChip";
import { PlayButton } from "./Transcript";

type Props = {
  scenario: Scenario;
  /** The reply being sent, shown until the server answers. */
  pending: string | null;
  voice: VoiceState;
  onPlay: (segments: SpeakRequest["segments"], key: string) => void;
  onStop: () => void;
  onNext: () => void;
  nextDisabled: boolean;
};

export const scenarioTurnKey = (scenario: Scenario, index: number) => `${scenario.id}:${index}`;

const FIT_STYLES: Record<Fit, string> = {
  in_tune: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200",
  partly: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
  missed: "bg-rose-100 text-rose-900 dark:bg-rose-400/20 dark:text-rose-200",
};

function FeedbackCard({ feedback, characterName, play }: { feedback: Feedback; characterName: string; play: React.ReactNode }) {
  return (
    <section
      aria-label="Feedback on your reply"
      className="flex flex-col gap-3 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${FIT_STYLES[feedback.fit]}`}>
          {FIT_LABELS[feedback.fit]}
        </span>
        {play}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-zinc-600 dark:text-zinc-300">{characterName} was feeling</span>
        <EmotionChip emotion={feedback.feeling} />
      </div>
      {feedback.cues.length > 0 && (
        <div className="text-sm">
          <p className="font-medium">What showed it</p>
          <ul className="mt-1 list-disc pl-5 text-zinc-600 dark:text-zinc-300">
            {feedback.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        </div>
      )}
      <dl className="grid gap-2 text-sm">
        <div>
          <dt className="font-medium">What went well</dt>
          <dd className="text-zinc-600 dark:text-zinc-300">{feedback.wentWell}</dd>
        </div>
        <div>
          <dt className="font-medium">One thing to try</dt>
          <dd className="text-zinc-600 dark:text-zinc-300">{feedback.tryThis}</dd>
        </div>
      </dl>
      <blockquote className="rounded-xl border-l-4 border-teal-600 bg-white px-3 py-2 text-sm dark:bg-zinc-950">
        <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          You could say
        </span>
        “{feedback.exampleReply}”
      </blockquote>
      {feedback.usedHint && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">You used a hint for this one. That&apos;s fine.</p>
      )}
    </section>
  );
}

export function ScenarioTranscript({ scenario, pending, voice, onPlay, onStop, onNext, nextDisabled }: Props) {
  const play = (index: number, label: string, small = true) => {
    const key = scenarioTurnKey(scenario, index);
    return (
      <PlayButton
        label={label}
        small={small}
        active={voice.activeKey === key}
        status={voice.status}
        onPlay={() => onPlay(turnSegments(scenario.turns[index], scenario), key)}
        onStop={onStop}
      />
    );
  };
  const canPlay = !voice.unavailable;

  return (
    <ol aria-label="Conversation" className="flex flex-col gap-4">
      {scenario.turns.map((turn, i) => {
        switch (turn.role) {
          case "narrator":
            return (
              <li key={i} className="flex flex-col gap-2">
                <p className="border-l-4 border-zinc-300 pl-3 italic leading-relaxed text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                  {turn.text}
                </p>
                {canPlay && <div>{play(i, "Hear the scene")}</div>}
              </li>
            );
          case "character":
            // The character's emotion is the answer: never shown here.
            return (
              <li key={i} className="flex flex-col items-start gap-1">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{scenario.characterName}</span>
                <p className="max-w-[90%] rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-3 leading-relaxed dark:bg-zinc-800">
                  {turn.text}
                </p>
                {canPlay && play(i, `Hear ${scenario.characterName} again`)}
              </li>
            );
          case "user":
            return (
              <li key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-teal-700 px-4 py-2 leading-relaxed text-white">
                  {turn.text}
                </p>
              </li>
            );
          case "feedback":
            return (
              <li key={i}>
                <FeedbackCard
                  feedback={turn.feedback}
                  characterName={scenario.characterName}
                  play={canPlay ? play(i, "Hear feedback") : null}
                />
              </li>
            );
          case "hint":
            return (
              <li key={i} className="flex flex-col gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-950 ring-1 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-100 dark:ring-sky-900">
                <span className="font-semibold">Hint {turn.level}</span>
                <span className="leading-relaxed">{turn.text}</span>
              </li>
            );
          case "wrapup":
            return (
              <li
                key={i}
                className="flex flex-col gap-3 rounded-2xl bg-teal-50 p-4 ring-1 ring-teal-600/30 dark:bg-teal-950/40 dark:ring-teal-400/30"
              >
                <span className="text-sm font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">
                  Scenario finished
                </span>
                <p className="leading-relaxed">{turn.text}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onNext}
                    disabled={nextDisabled}
                    className="rounded-xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800 disabled:opacity-50"
                  >
                    Next scenario
                  </button>
                  {canPlay && play(i, "Hear summary", false)}
                </div>
              </li>
            );
        }
      })}
      {pending && (
        <li className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-teal-700/70 px-4 py-2 leading-relaxed text-white">
            {pending}
          </p>
        </li>
      )}
    </ol>
  );
}
