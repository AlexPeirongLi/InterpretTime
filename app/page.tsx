import Link from "next/link";

const STEPS = [
  {
    title: "Listen",
    body: "Your practice partner says an everyday sentence in a particular tone of voice.",
  },
  {
    title: "Say what you heard",
    body: "Tell it how the sentence sounded, in your own words. Speak or type. There are no wrong answers.",
  },
  {
    title: "Connect it",
    body: "When one is hard to read, it explains it using an emotion you already recognise, and lets you hear the two side by side.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-4 py-12 sm:px-8">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700 dark:text-teal-300">
          InterpretTime
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Practise hearing emotion in a voice.
        </h1>
        <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
          A spoken conversation for anyone who finds tone of voice hard to read. You start from the
          emotions you already recognise and build out from there, at your own pace.
        </p>
      </header>

      <ol className="flex flex-col gap-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-900 dark:bg-teal-400/20 dark:text-teal-200">
              {i + 1}
            </span>
            <span>
              <span className="block font-medium">{step.title}</span>
              <span className="block leading-relaxed text-zinc-600 dark:text-zinc-300">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3">
        <Link
          href="/talk"
          className="inline-flex w-full items-center justify-center rounded-xl bg-teal-700 px-6 py-4 text-lg font-medium text-white transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:w-auto sm:self-start"
        >
          Start talking
        </Link>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Turn your sound on. A microphone is optional: you can type instead.
        </p>
      </div>

      <p className="border-t border-zinc-200 pt-6 text-sm leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        This is practice at recognising emotion in speech. It is not a diagnosis or a treatment. The
        voice is computer-generated, so it will not always sound exactly like a person would.
      </p>
    </main>
  );
}
