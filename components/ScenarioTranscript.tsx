import { FIT_LABELS, TONE_LABELS } from "@/lib/client/progress";
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
  onPlay: (segments: SpeakRequest["segments"], key: string, userVoiceId?: string) => void;
  onStop: () => void;
  /** Plays a recording kept in the browser. */
  onPlayRecording: (url: string, key: string) => void;
  /** The person's voice copy, if they made one. */
  voiceCopy: string | null;
  /** The person's own recording of reply number n (1-based), if it was spoken this visit. */
  recordingFor: (replyNumber: number) => string | null;
  onNext: () => void;
  nextDisabled: boolean;
};

export const scenarioTurnKey = (scenario: Scenario, index: number) => `${scenario.id}:${index}`;

const FIT_STYLES: Record<Fit, string> = {
  in_tune: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200",
  partly: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
  missed: "bg-rose-100 text-rose-900 dark:bg-rose-400/20 dark:text-rose-200",
};

function FeedbackCard({
  feedback,
  characterName,
  play,
  number,
  reply,
  yourVoice,
}: {
  feedback: Feedback;
  characterName: string;
  play: React.ReactNode;
  number: number;
  reply: string;
  /** "Hear it in your voice" and "Your recording", when the tone didn't fit. */
  yourVoice: React.ReactNode;
}) {
  return (
    <section
      aria-label={`Feedback on reply ${number}`}
      className="flex flex-col gap-3 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
    >
      <p className="text-sm">
        <span className="font-semibold">Reply {number}: </span>
        <span className="text-zinc-600 dark:text-zinc-300">“{reply}”</span>
      </p>
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
      <blockquote className="rounded-xl border-l-4 border-orange-600 bg-white px-3 py-2 text-sm dark:bg-zinc-950">
        <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          You could say
        </span>
        “{feedback.exampleReply}”
      </blockquote>
      {feedback.tone && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">How you sounded</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${FIT_STYLES[feedback.tone.fit]}`}>
              {TONE_LABELS[feedback.tone.fit]}
            </span>
          </div>
          <p className="text-zinc-600 dark:text-zinc-300">Your voice {feedback.tone.heard}.</p>
          <p className="text-zinc-600 dark:text-zinc-300">{feedback.tone.tip}</p>
          {yourVoice}
        </div>
      )}
      {feedback.usedHint && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">You used a hint for this one. That&apos;s fine.</p>
      )}
    </section>
  );
}

export function ScenarioTranscript({
  scenario,
  pending,
  voice,
  onPlay,
  onStop,
  onPlayRecording,
  voiceCopy,
  recordingFor,
  onNext,
  nextDisabled,
}: Props) {
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

  /**
   * When the words were right but the tone wasn't: their sentence in a copy of
   * their own voice, said the better way, next to their own recording.
   */
  const yourVoice = (feedback: Feedback, reply: string, number: number) => {
    const better = feedback.tone?.better;
    if (!better || !reply) return null;
    const inVoiceKey = `${scenario.id}:your-voice:${number}`;
    const recordingKey = `${scenario.id}:recording:${number}`;
    const recording = recordingFor(number);
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-violet-50 px-3 py-2.5 dark:bg-violet-950/40">
        <p>
          <span className="font-medium">Try it {better}:</span> “{reply}”
        </p>
        <div className="flex flex-wrap gap-2">
          {canPlay && (
            <PlayButton
              // With a voice copy, their own voice; without one, the narrator,
              // so the better tone can always be heard.
              label={voiceCopy ? "Hear it in your voice" : "Hear it said that way"}
              small
              active={voice.activeKey === inVoiceKey}
              status={voice.status}
              onPlay={() =>
                onPlay(
                  [{ text: reply, emotion: feedback.feeling, voice: voiceCopy ? "user" : "narrator", delivery: better }],
                  inVoiceKey,
                  voiceCopy ?? undefined,
                )
              }
              onStop={onStop}
            />
          )}
          {recording && (
            <PlayButton
              label="Your recording"
              small
              active={voice.activeKey === recordingKey}
              status={voice.status}
              onPlay={() => onPlayRecording(recording, recordingKey)}
              onStop={onStop}
            />
          )}
        </div>
        {!voiceCopy && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            To hear this in your own voice, set up a voice copy from Progress.
          </p>
        )}
      </div>
    );
  };

  // Step-ins, listed in the review.
  const practices = scenario.turns.flatMap((t) => (t.role === "practice" && t.outcome !== "pending" ? [t] : []));

  // Each feedback turn, with the reply it is about, for the review at the end.
  const reviews = scenario.turns.flatMap((turn, index) => {
    if (turn.role !== "feedback") return [];
    const reply = scenario.turns.slice(0, index).findLast((t) => t.role === "user");
    return [{ index, feedback: turn.feedback, reply: reply?.role === "user" ? reply.text : "" }];
  }).map((review, n) => ({ ...review, number: n + 1 }));

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
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-orange-700 px-4 py-2 leading-relaxed text-white">
                  {turn.text}
                </p>
              </li>
            );
          case "feedback":
            // Kept for the review at the end, so the conversation isn't interrupted.
            return null;
          case "practice": {
            const key = `${scenario.id}:practice:${i}`;
            const lineSegments = turnSegments(turn, scenario, voiceCopy !== null).slice(-1);
            return (
              <li
                key={i}
                aria-label="Practice this reply"
                className="flex flex-col gap-3 rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:ring-violet-900"
              >
                <span className="text-sm font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
                  Let&apos;s practise this one
                </span>
                <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">{turn.intro}</p>
                <div className="rounded-xl bg-white px-4 py-3 dark:bg-zinc-950">
                  <p className="text-lg leading-snug">“{turn.line}”</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Said {turn.delivery}.</p>
                </div>
                {canPlay && (
                  <div>
                    <PlayButton
                      label={voiceCopy ? "Hear it in your voice" : "Hear it again"}
                      small
                      active={voice.activeKey === key}
                      status={voice.status}
                      onPlay={() => onPlay(lineSegments, key, voiceCopy ?? undefined)}
                      onStop={onStop}
                    />
                  </div>
                )}
                <p className="text-sm font-medium text-violet-900 dark:text-violet-200">
                  {turn.outcome === "copied"
                    ? `✓ You said it the right way${turn.tries > 1 ? ` on try ${turn.tries}` : ""}.`
                    : turn.outcome === "skipped"
                      ? `Moved on after ${turn.tries} tries. That's fine: it's noted in your review.`
                      : `Your turn: say it back, copying how it sounded.${turn.tries > 0 ? ` Tries so far: ${turn.tries}.` : ""}`}
                </p>
                {!voiceCopy && turn.outcome === "pending" && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    With a voice copy, you&apos;d hear this in your own voice. Set one up from Progress.
                  </p>
                )}
              </li>
            );
          }
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
                className="flex flex-col gap-3 rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-600/30 dark:bg-orange-950/40 dark:ring-orange-400/30"
              >
                <span className="text-sm font-semibold uppercase tracking-wide text-orange-800 dark:text-orange-300">
                  Your review
                </span>
                <p className="leading-relaxed">{turn.text}</p>
                <div className="flex flex-col gap-3">
                  {practices.length > 0 && (
                    <div className="flex flex-col gap-1 rounded-xl bg-violet-50 px-3 py-2.5 text-sm dark:bg-violet-950/40">
                      <span className="font-medium">Lines you practised</span>
                      {practices.map((p, n) => (
                        <p key={n} className="text-zinc-700 dark:text-zinc-300">
                          “{p.line}”:{" "}
                          {p.outcome === "copied" ? `got it${p.tries > 1 ? ` on try ${p.tries}` : ""}` : `moved on after ${p.tries} tries`}
                        </p>
                      ))}
                    </div>
                  )}
                  <span className="text-sm font-medium">Each reply</span>
                  {reviews.map((review) => (
                    <FeedbackCard
                      key={review.index}
                      number={review.number}
                      reply={review.reply}
                      feedback={review.feedback}
                      characterName={scenario.characterName}
                      play={canPlay ? play(review.index, "Hear feedback") : null}
                      yourVoice={yourVoice(review.feedback, review.reply, review.number)}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onNext}
                    disabled={nextDisabled}
                    className="rounded-xl bg-orange-700 px-5 py-3 font-medium text-white transition hover:bg-orange-800 disabled:opacity-50"
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
          <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-orange-700/70 px-4 py-2 leading-relaxed text-white">
            {pending}
          </p>
        </li>
      )}
    </ol>
  );
}
