// A scripted stand-in for the AI in conversation mode, used by
// /api/conversation when ANTHROPIC_API_KEY is not set. It lets the page be
// built and tested before the real AI works. It follows the same shapes as the
// real route but is not smart: it judges replies by looking for a few words.

import { currentFeeling, hintsThisTurn, repliesFor } from "./conversation";
import {
  HINTS_PER_TURN,
  type ConversationLength,
  type ConversationProgress,
  type ConversationResponse,
  type Feedback,
  type Fit,
  type ReplyDelivery,
  type Scenario,
} from "./types";

const SETUP = "Your friend Sam has just come back from a job interview. They sit down next to you.";

const LINES = [
  "I don't think it went very well.",
  "I just kept forgetting what I wanted to say.",
  "Yeah. Maybe. I really wanted this one.",
];

const HINTS = [
  "Listen to how slowly Sam is speaking, and how quiet the voice is.",
  "Sam sounds sad. They might want you to notice that it was hard for them.",
];

const KIND_WORDS = ["sorry", "sounds", "that's hard", "must be", "feel", "are you ok", "here for"];

function judge(reply: string): Fit {
  const text = reply.toLowerCase();
  const hits = KIND_WORDS.filter((w) => text.includes(w)).length;
  return hits >= 2 ? "in_tune" : hits === 1 ? "partly" : "missed";
}

export function mockStart(progress: ConversationProgress, length: ConversationLength = "quick"): ConversationResponse {
  const scenario: Scenario = {
    id: `mock-${Date.now()}`,
    title: "After the interview",
    characterName: "Sam",
    emotion: "sad",
    turns: [
      { role: "narrator", text: SETUP },
      { role: "character", text: LINES[0], emotion: "sad" },
    ],
    exchanges: 0,
    done: false,
    length,
  };
  return { scenario, progress, mock: true };
}

export function mockReply(
  scenario: Scenario,
  text: string,
  progress: ConversationProgress,
  delivery?: ReplyDelivery,
): ConversationResponse {
  const fit = judge(text);
  const usedHint = hintsThisTurn(scenario) > 0;
  const feeling = currentFeeling(scenario);
  // The script has no real judgement of tone: any measured spoken reply gets
  // the same example tone feedback, so the page can show it.
  const spoken = delivery?.measured.pitchHz != null;
  const feedback: Feedback = {
    fit,
    feeling,
    cues: ["slow, quiet voice", 'the words "not very well"'],
    wentWell: fit === "missed" ? "You kept the conversation going." : "You noticed that Sam was having a hard time.",
    tryThis: "Name what you think they are feeling before giving advice.",
    exampleReply: "That sounds really disappointing. Do you want to talk about it?",
    usedHint,
    tone: spoken
      ? { fit: "partly", heard: "a little quick, at about your normal loudness", tip: "Try slowing down a little, so Sam feels you have time for them." }
      : null,
  };
  const exchanges = scenario.exchanges + 1;
  const done = exchanges >= repliesFor(scenario);

  return {
    scenario: {
      ...scenario,
      exchanges,
      done,
      turns: [
        ...scenario.turns,
        { role: "user", text },
        { role: "feedback", feedback },
        done
          ? { role: "wrapup", text: "Sam was sad about the interview. Noticing that first is what helps most." }
          : { role: "character", text: LINES[exchanges % LINES.length], emotion: "sad" },
      ],
    },
    progress: {
      results: [...progress.results, { emotion: feeling, fit, usedHint, ...(spoken ? { toneFit: "partly" as const } : {}) }],
    },
    mock: true,
  };
}

export function mockHint(scenario: Scenario, progress: ConversationProgress): ConversationResponse {
  const level = Math.min(hintsThisTurn(scenario) + 1, HINTS_PER_TURN) as 1 | 2;
  return {
    scenario: { ...scenario, turns: [...scenario.turns, { role: "hint", level, text: HINTS[level - 1] }] },
    progress,
    mock: true,
  };
}
