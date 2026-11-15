import Link from "next/link";

const MODES = [
  {
    href: "/talk",
    name: "Quickfire",
    line: "Hear one everyday sentence at a time in a particular tone, and say what emotion you heard.",
    cta: "Start Quickfire",
  },
  {
    href: "/conversation",
    name: "Conversation",
    line: "Step into a short scene with someone who is feeling something, and talk to them as you would for real.",
    cta: "Start a conversation",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-12 sm:px-8">
      <header className="flex flex-col gap-4">
        <p className="text-4xl font-black tracking-tight text-teal-700 sm:text-5xl dark:text-teal-300">InterpretTime</p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Practise hearing emotion in a voice.
        </h1>
        <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
          For people with alexithymia, and anyone who finds social situations awkward.
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
                <span className="mt-auto inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-3 font-medium text-white transition group-hover:bg-teal-800">
                  {mode.cta}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
