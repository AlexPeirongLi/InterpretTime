// Saves the conversation and profile in this browser, so a reload carries on
// where the person left off. Nothing is sent anywhere else.

import type { Profile, Turn } from "@/lib/types";

const KEY = "interprettime:conversation:v1";

export type Saved = { history: Turn[]; profile: Profile };

export function loadConversation(): Saved | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (
      typeof data === "object" &&
      data !== null &&
      "history" in data &&
      "profile" in data &&
      Array.isArray(data.history) &&
      typeof data.profile === "object" &&
      data.profile !== null &&
      "attempts" in data.profile &&
      Array.isArray(data.profile.attempts)
    ) {
      return data as Saved;
    }
  } catch {
    // Storage blocked or the saved data is broken: start fresh.
  }
  return null;
}

export function saveConversation(saved: Saved): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Private window or storage full: the conversation still works, it just
    // won't survive a reload.
  }
}

export function clearConversation(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
