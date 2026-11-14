"use client";

import dynamic from "next/dynamic";

// Conversation mode starts from what is saved in this browser, so it is only
// rendered in the browser, never on the server.
const ScenarioPractice = dynamic(() => import("./ScenarioPractice"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-zinc-500">Loading…</p>,
});

export function ScenarioClient() {
  return <ScenarioPractice />;
}
