// Turns conversation mode turns into what /api/speak reads out.
// Narrator, feedback, hints and the wrap-up use the calm narrator voice, so
// feedback never sounds like the other person talking.

import { EMOTION_LABELS } from "@/lib/emotions";
import type { Feedback, Scenario, ScenarioTurn, SpeakRequest } from "@/lib/types";
import { FIT_LABELS } from "./progress";

type Segments = SpeakRequest["segments"];

// /api/speak takes at most 600 characters per segment and 12 segments.
const MAX_CHARS = 580;
const MAX_SEGMENTS = 12;

/** Splits long text at sentence ends so each piece fits in one segment. */
function chunk(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const pieces: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && (current + sentence).length > MAX_CHARS) {
      pieces.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces.flatMap((p) => (p.length > MAX_CHARS ? p.match(/.{1,580}(\s|$)/g) ?? [p] : [p]));
}

const narrate = (text: string): Segments =>
  chunk(text).map((t) => ({ text: t, emotion: "neutral", voice: "narrator" }));

/** What the narrator says for a feedback card. */
export function feedbackScript(feedback: Feedback, characterName: string): string {
  const parts = [
    `${FIT_LABELS[feedback.fit]}.`,
    `${characterName} was feeling ${EMOTION_LABELS[feedback.feeling].toLowerCase()}.`,
  ];
  if (feedback.cues.length) parts.push(`You could tell from ${feedback.cues.join(", and ")}.`);
  parts.push(feedback.wentWell, feedback.tryThis, `You could say: ${feedback.exampleReply}`);
  return parts.filter(Boolean).join(" ");
}

/** The segments for one turn. The person's own replies are not read out. */
export function turnSegments(turn: ScenarioTurn, scenario: Scenario): Segments {
  switch (turn.role) {
    case "narrator":
    case "hint":
    case "wrapup":
      return narrate(turn.text);
    case "character":
      return chunk(turn.text).map((t) => ({ text: t, emotion: turn.emotion, voice: "character" }));
    case "feedback":
      return narrate(feedbackScript(turn.feedback, scenario.characterName));
    case "user":
      return [];
  }
}

/** The segments for several turns, played as one clip. */
export function turnsSegments(turns: ScenarioTurn[], scenario: Scenario): Segments {
  return turns.flatMap((t) => turnSegments(t, scenario)).slice(0, MAX_SEGMENTS);
}
