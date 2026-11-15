import type { AiTurn, Segment, SpeakRequest, Turn } from "@/lib/types";
import { EmotionChip } from "./EmotionChip";
import type { VoiceState } from "@/lib/client/useVoice";

type Props = {
  history: Turn[];
  voice: VoiceState;
  onPlay: (segments: SpeakRequest["segments"], key: string) => void;
  onStop: () => void;
};

export const turnKey = (index: number) => `turn-${index}`;
const segmentKey = (turn: number, segment: number) => `turn-${turn}-segment-${segment}`;

export function PlayButton({
  label,
  active,
  status,
  onPlay,
  onStop,
  small,
}: {
  label: string;
  active: boolean;
  status: VoiceState["status"];
  onPlay: () => void;
  onStop: () => void;
  small?: boolean;
}) {
  const busy = active && status !== "idle";
  const text = !busy ? label : status === "loading" ? "Loading…" : "Stop";
  return (
    <button
      type="button"
      onClick={busy ? onStop : onPlay}
      aria-label={busy ? `Stop: ${label}` : label}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 ${
        small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      }`}
    >
      <span aria-hidden>{busy ? (status === "loading" ? "…" : "■") : "▶"}</span>
      {text}
    </button>
  );
}

function PracticeSentence({
  segment,
  revealed,
  playButton,
}: {
  segment: Segment;
  revealed: boolean;
  playButton: React.ReactNode;
}) {
  return (
    <div className="my-2 rounded-r-lg border-l-4 border-violet-600 bg-zinc-50 py-2.5 pl-4 pr-3 dark:border-violet-400 dark:bg-zinc-900/60">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
          Practice sentence
        </span>
        {revealed ? (
          <EmotionChip emotion={segment.emotion} prefix="Said: " />
        ) : (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">How does it sound?</span>
        )}
      </div>
      <p className="text-xl font-medium leading-snug">“{segment.text}”</p>
      <div className="mt-2.5">{playButton}</div>
    </div>
  );
}

function AiMessage({
  turn,
  index,
  answered,
  voice,
  onPlay,
  onStop,
}: {
  turn: AiTurn;
  index: number;
  answered: boolean;
  voice: VoiceState;
  onPlay: Props["onPlay"];
  onStop: Props["onStop"];
}) {
  const key = turnKey(index);
  const speaking = voice.activeKey === key && voice.status === "playing";
  return (
    <div className="flex flex-col gap-2 rounded-2xl rounded-tl-sm bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="flex items-center justify-end gap-2">
        {speaking && <span className="text-sm text-orange-700 dark:text-orange-300">speaking…</span>}
        <PlayButton
          label="Replay"
          small
          active={voice.activeKey === key}
          status={voice.status}
          onPlay={() => onPlay(turn.segments, key)}
          onStop={onStop}
        />
      </div>
      {turn.segments.map((segment, i) => {
        if (segment.example) {
          const k = segmentKey(index, i);
          return (
            <PracticeSentence
              key={i}
              segment={segment}
              revealed={answered}
              playButton={
                <PlayButton
                  label="Hear it again"
                  small
                  active={voice.activeKey === k}
                  status={voice.status}
                  onPlay={() => onPlay([segment], k)}
                  onStop={onStop}
                />
              }
            />
          );
        }
        return (
          <p key={i} className="leading-relaxed">
            {segment.emotion !== "neutral" && (
              <span className="mr-2 align-middle">
                <EmotionChip emotion={segment.emotion} />
              </span>
            )}
            {segment.text}
          </p>
        );
      })}
    </div>
  );
}

export function Transcript({ history, voice, onPlay, onStop }: Props) {
  return (
    <ol className="flex flex-col gap-4" aria-label="Conversation">
      {history.map((turn, index) => (
        <li key={index} className={turn.role === "user" ? "flex justify-end" : ""}>
          {turn.role === "ai" ? (
            <AiMessage
              turn={turn}
              index={index}
              answered={history.slice(index + 1).some((t) => t.role === "user")}
              voice={voice}
              onPlay={onPlay}
              onStop={onStop}
            />
          ) : (
            <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-orange-700 px-4 py-3 leading-relaxed text-white">
              <span className="sr-only">You: </span>
              {turn.text}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
