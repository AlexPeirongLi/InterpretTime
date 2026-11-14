import Link from "next/link";

const MODES = [
  {
    href: "/talk",
    name: "Quickfire",
    line: "Hear one everyday sentence at a time in a particular tone, and say what emotion you heard.",
    practises: "Recognising an emotion",
    cta: "Start Quickfire",
  },
  {
    href: "/conversation",
    name: "Conversation",
    line: "Step into a short scene with someone who is feeling something, and talk to them as you would for real.",
    practises: "Recognising it and replying in a way that fits",
    cta: "Start a conversation",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-12 sm:px-8">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700 dark:text-teal-300">
          InterpretTime
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Practise hearing emotion in a voice.
        </h1>
        <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
          For anyone who finds tone of voice hard to read. You start from the emotions you already
          recognise and build out from there, at your own pace. There are no wrong answers.
        </p>
      </header>

      <section aria-labelledby="modes-heading" className="flex flex-col gap-4">
        <h2 id="modes-heading" className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Choose how to practise
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {MODES.map((mode) => (
            <li key={mode.href}>
              <Link
                href={mode.href}
                className="group flex h-full flex-col gap-3 rounded-2xl p-5 ring-1 ring-zinc-200 transition hover:bg-teal-50 hover:ring-teal-600/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:ring-zinc-800 dark:hover:bg-teal-950/40 dark:hover:ring-teal-400/40"
              >
                <span className="text-xl font-semibold">{mode.name}</span>
                <span className="leading-relaxed text-zinc-600 dark:text-zinc-300">{mode.line}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Practises: {mode.practises.toLowerCase()}
                </span>
                <span className="mt-auto inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-3 font-medium text-white transition group-hover:bg-teal-800">
                  {mode.cta}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Turn your sound on. A microphone is optional: you can type instead.
        </p>
      </section>

      <p className="border-t border-zinc-200 pt-6 text-sm leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        This is practice at recognising emotion in speech. It is not a diagnosis or a treatment. The
        voices are computer-generated, so they will not always sound exactly like a person would.
      </p>
    </main>
  );
}
