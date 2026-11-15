"use client";

// The /demo page: one button per feature, each opening the real page already
// at that moment, so a presentation doesn't have to play through whole
// conversations. Opening costs nothing; play buttons on the pages use credit.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  clearConversation,
  clearScenario,
  saveConversation,
  saveEmotionSet,
  saveScenario,
} from "@/lib/client/storage";
import {
  demoMidScene,
  demoProgress,
  demoQuickfire,
  demoReview,
  demoSarcasm,
  demoStepIn,
  markOpenDirectly,
} from "@/lib/demo";
import type { Scenario } from "@/lib/types";

type Step = { title: string; shows: string; open: () => string };

const openScenario = (scenario: Scenario | null, directly = true) => () => {
  saveScenario({ scenario, progress: demoProgress });
  saveEmotionSet(scenario?.emotionSet ?? "basics");
  if (directly) markOpenDirectly();
  return "/conversation";
};

const SECTIONS: { heading: string; steps: Step[] }[] = [
  {
    heading: "Quickfire",
    steps: [
      {
        title: "Quickfire, part-way through",
        shows: "Tap the emotion you hear. Deeper emotions are on, a sarcastic sentence is waiting, and the side panel shows what's recognised so far.",
        open: () => {
          saveConversation(demoQuickfire);
          saveEmotionSet("both");
          return "/talk";
        },
      },
    ],
  },
  {
    heading: "Conversation mode",
    steps: [
      {
        title: "Choosing a conversation",
        shows: "Basics or deeper emotions, Quick / Medium / Full, and setting up your voice. Open Progress to see the progress panel filled in.",
        open: openScenario(null),
      },
      {
        title: "Mid-conversation, with a hint",
        shows: "Sam is sad after an interview. A hint is showing; reply by typing or with the microphone.",
        open: openScenario(demoMidScene),
      },
      {
        title: "Step-in after two misses",
        shows: "Jordan is angry and two replies missed it, so the scene pauses: hear a good reply and say it back.",
        open: openScenario(demoStepIn),
      },
      {
        title: "The review at the end",
        shows: "The overall review, then each reply: words, tone, “Try it softer…” and Hear it in your voice. Scroll down.",
        open: openScenario(demoReview),
      },
      {
        title: "Deeper emotions: sarcasm",
        shows: "Chris is sarcastic about the printer. Taking it literally missed; reading the real feeling got it.",
        open: openScenario(demoSarcasm),
      },
      {
        title: "Coming back to an unfinished conversation",
        shows: "The Welcome back screen: resume where you left off, or start a new one.",
        open: openScenario(demoMidScene, false),
      },
    ],
  },
];

export function DemoLauncher() {
  const router = useRouter();
  const [cleared, setCleared] = useState(false);

  const go = (step: Step) => router.push(step.open());

  const clearDemo = () => {
    clearScenario();
    clearConversation();
    saveEmotionSet("basics");
    setCleared(true);
  };

  return (
    <main className="panel mx-auto my-6 flex w-[calc(100%-2rem)] max-w-3xl flex-col gap-8 px-5 py-8 sm:px-10">
      <header className="flex flex-col gap-2">
        <Link href="/" className="logo text-3xl font-black tracking-tight">
          InterpretTime
        </Link>
        <h1 className="text-2xl font-semibold">Demo</h1>
        <p className="text-zinc-600 dark:text-zinc-300">
          Jump straight to any part of the site with example conversations already filled in. Opening them is free;
          play buttons use voice credit as normal. This replaces any conversation saved in this browser, but keeps your
          voice copy.
        </p>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {section.heading}
          </h2>
          <ul className="flex flex-col gap-3">
            {section.steps.map((step) => (
              <li key={step.title}>
                <button
                  type="button"
                  onClick={() => go(step)}
                  className="group flex w-full items-center justify-between gap-4 rounded-2xl p-4 text-left ring-1 ring-zinc-200 transition hover:bg-orange-50 hover:ring-orange-600/50 dark:ring-zinc-800 dark:hover:bg-orange-950/40"
                >
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold">{step.title}</span>
                    <span className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{step.shows}</span>
                  </span>
                  <span className="shrink-0 rounded-xl bg-orange-700 px-4 py-2 text-sm font-medium text-white transition group-hover:bg-orange-800">
                    Open
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
        <button
          type="button"
          onClick={clearDemo}
          className="rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-zinc-300 hover:bg-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-800"
        >
          Clear demo data
        </button>
        {cleared && <span className="text-sm text-zinc-600 dark:text-zinc-300">Cleared. The site starts fresh again.</span>}
      </div>
    </main>
  );
}
