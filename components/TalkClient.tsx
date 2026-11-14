"use client";

import dynamic from "next/dynamic";

// The conversation starts from what is saved in this browser, so it is only
// rendered in the browser, never on the server.
const Conversation = dynamic(() => import("./Conversation"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-zinc-500">Loading…</p>,
});

export function TalkClient() {
  return <Conversation />;
}
