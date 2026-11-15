import { REPLIES_BY_LENGTH, type ConversationLength } from "@/lib/types";

const OPTIONS: { length: ConversationLength; name: string; time: string }[] = [
  { length: "quick", name: "Quick", time: "about 2 minutes" },
  { length: "medium", name: "Medium", time: "about 4 minutes" },
  { length: "full", name: "Full", time: "about 6 minutes" },
];

type Props = {
  /** The length picked last time, shown as the suggested one. */
  last: ConversationLength | null;
  disabled: boolean;
  onPick: (length: ConversationLength) => void;
};

/** Choose how long the next conversation lasts before the review. */
export function LengthPicker({ last, disabled, onPick }: Props) {
  return (
    <section aria-label="Choose a conversation length" className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">How long a conversation?</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          You talk without interruptions, then get a review of every reply at the end.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <button
            key={option.length}
            type="button"
            disabled={disabled}
            onClick={() => onPick(option.length)}
            className={`flex flex-col items-start gap-0.5 rounded-xl px-4 py-3 text-left ring-1 transition hover:bg-orange-50 disabled:opacity-50 dark:hover:bg-orange-950/40 ${
              option.length === last
                ? "ring-2 ring-orange-600 dark:ring-orange-400"
                : "ring-zinc-300 dark:ring-zinc-700"
            }`}
          >
            <span className="font-semibold">{option.name}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-300">
              {REPLIES_BY_LENGTH[option.length]} replies, {option.time}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
