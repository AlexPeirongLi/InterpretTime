// Rules about a scenario's turns that both the server and the pages need.

import { HINTS_PER_TURN, REPLIES_BY_LENGTH, type Emotion, type Fit, type PracticeTurn, type Scenario, type ScenarioTurn } from "./types";

/** How many replies this scenario lasts before the review. */
export function repliesFor(scenario: Scenario): number {
  return REPLIES_BY_LENGTH[scenario.length ?? "quick"];
}

/** The turns since the person last replied (or since the start). */
export function currentTurnTurns(scenario: Scenario): ScenarioTurn[] {
  const lastUser = scenario.turns.findLastIndex((t) => t.role === "user");
  return scenario.turns.slice(lastUser + 1);
}

/** Hints given since the person last replied. */
export function hintsThisTurn(scenario: Scenario): number {
  return currentTurnTurns(scenario).filter((t) => t.role === "hint").length;
}

/** True when the person can ask for another hint now. */
export function canHint(scenario: Scenario): boolean {
  return !scenario.done && hintsThisTurn(scenario) < HINTS_PER_TURN;
}

/** The emotion of the character's most recent line: what a reply is judged against. */
export function currentFeeling(scenario: Scenario): Emotion {
  const line = scenario.turns.findLast((t) => t.role === "character");
  return line?.role === "character" ? line.emotion : scenario.emotion;
}

// ---------------------------------------------------------------------------
// Step-ins (STEP-IN.md)
// ---------------------------------------------------------------------------

/** Attempts before "Move on for now" appears. */
export const TRIES_BEFORE_MOVE_ON = 3;

/** The step-in waiting for the person to copy it, if there is one. */
export function pendingPractice(scenario: Scenario): PracticeTurn | null {
  const last = scenario.turns.findLast((t) => t.role === "practice");
  return last?.role === "practice" && last.outcome === "pending" ? last : null;
}

/**
 * True when this reply should trigger a step-in: it wasn't in tune, the
 * person's previous reply wasn't either, and there has been no step-in
 * since that previous reply. Never on the last reply, which goes to review.
 */
export function shouldStepIn(scenario: Scenario, fitNow: Fit, isLastReply: boolean): boolean {
  if (fitNow === "in_tune" || isLastReply) return false;
  for (let i = scenario.turns.length - 1; i >= 0; i--) {
    const turn = scenario.turns[i];
    if (turn.role === "practice") return false;
    if (turn.role === "feedback") return turn.feedback.fit !== "in_tune";
  }
  return false;
}

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/**
 * How close an attempt's words are to the line, from 0 to 1: the share of the
 * line's words that were said, lowered if lots of extra words were added.
 * Small slips ("Im" for "I am", one missing word) still score well.
 */
export function wordMatch(attempt: string, line: string): number {
  const target = words(line);
  const said = words(attempt);
  if (target.length === 0) return 0;
  const pool = new Map<string, number>();
  for (const w of said) pool.set(w, (pool.get(w) ?? 0) + 1);
  let hits = 0;
  for (const w of target) {
    const n = pool.get(w) ?? 0;
    if (n > 0) {
      hits++;
      pool.set(w, n - 1);
    }
  }
  const extra = Math.max(0, said.length - target.length * 1.5);
  return Math.max(0, (hits - extra) / target.length);
}

/** Close enough to count as the line. */
export const WORD_MATCH_NEEDED = 0.7;
