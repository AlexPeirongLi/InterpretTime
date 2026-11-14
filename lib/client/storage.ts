// Saves the conversation and profile in this browser, so a reload carries on
// where the person left off. Nothing is sent anywhere else.

import type { Baseline, ConversationProgress, Profile, Scenario, Turn } from "@/lib/types";

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

// ---------------------------------------------------------------------------
// Conversation mode: the current scenario and progress, kept apart from
// Quickfire so each mode's Start again only clears its own.
// ---------------------------------------------------------------------------

const SCENARIO_KEY = "interprettime:scenario:v1";

export type SavedScenario = { scenario: Scenario | null; progress: ConversationProgress };

export function loadScenario(): SavedScenario | null {
  try {
    const raw = window.localStorage.getItem(SCENARIO_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (
      typeof data === "object" &&
      data !== null &&
      "scenario" in data &&
      "progress" in data &&
      typeof data.progress === "object" &&
      data.progress !== null &&
      "results" in data.progress &&
      Array.isArray(data.progress.results) &&
      (data.scenario === null ||
        (typeof data.scenario === "object" && "turns" in data.scenario && Array.isArray(data.scenario.turns)))
    ) {
      return data as SavedScenario;
    }
  } catch {
    // Storage blocked or the saved data is broken: start fresh.
  }
  return null;
}

export function saveScenario(saved: SavedScenario): void {
  try {
    window.localStorage.setItem(SCENARIO_KEY, JSON.stringify(saved));
  } catch {
    // Still works, just won't survive a reload.
  }
}

export function clearScenario(): void {
  try {
    window.localStorage.removeItem(SCENARIO_KEY);
  } catch {
    // Nothing to clear.
  }
}

// ---------------------------------------------------------------------------
// Tone check: measurements of the person's normal voice. Kept apart from the
// scenario, so Start again does not make them record it again.
// ---------------------------------------------------------------------------

const BASELINE_KEY = "interprettime:voice-baseline:v1";

export function loadBaseline(): Baseline | null {
  try {
    const raw = window.localStorage.getItem(BASELINE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (
      typeof data === "object" &&
      data !== null &&
      "pitchHz" in data &&
      typeof data.pitchHz === "number" &&
      "loudnessDb" in data &&
      typeof data.loudnessDb === "number" &&
      "wordsPerSecond" in data &&
      typeof data.wordsPerSecond === "number"
    ) {
      return data as Baseline;
    }
  } catch {
    // Storage blocked or broken: record it again.
  }
  return null;
}

export function saveBaseline(baseline: Baseline): void {
  try {
    window.localStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
  } catch {
    // Works for this visit only.
  }
}
