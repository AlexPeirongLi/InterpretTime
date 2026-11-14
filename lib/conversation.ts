// Rules about a scenario's turns that both the server and the pages need.

import { HINTS_PER_TURN, REPLIES_BY_LENGTH, type Emotion, type Scenario, type ScenarioTurn } from "./types";

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
