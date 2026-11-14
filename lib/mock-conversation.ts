// A scripted stand-in for the AI in conversation mode, used by
// /api/conversation when ANTHROPIC_API_KEY is not set. It lets the page be
// built and tested before the real AI works, and costs nothing to run. It
// follows the same shapes as the real route but is not smart: it judges
// replies by looking for a few words.

import { currentFeeling, hintsThisTurn, repliesFor } from "./conversation";
import {
  HINTS_PER_TURN,
  type ConversationLength,
  type ConversationProgress,
  type ConversationResponse,
  type Emotion,
  type EmotionSet,
  type Feedback,
  type Fit,
  type ReplyDelivery,
  type Scenario,
} from "./types";

type Script = {
  title: string;
  name: string;
  emotion: Emotion;
  setup: string;
  lines: string[];
  hints: [string, string];
  /** Words in a reply that suggest it picked up the feeling. */
  goodWords: string[];
  cues: string[];
  tryThis: string;
  exampleReply: string;
  wrapup: string;
};

const SCRIPTS = {
  sad: {
    title: "After the interview",
    name: "Sam",
    emotion: "sad",
    setup: "Your friend Sam has just come back from a job interview. They sit down next to you.",
    lines: [
      "I don't think it went very well.",
      "I just kept forgetting what I wanted to say.",
      "Yeah. Maybe. I really wanted this one.",
    ],
    hints: [
      "Listen to how slowly Sam is speaking, and how quiet the voice is.",
      "Sam sounds sad. They might want you to notice that it was hard for them.",
    ],
    goodWords: ["sorry", "sounds", "that's hard", "must be", "feel", "are you ok", "here for"],
    cues: ["slow, quiet voice", "the words 'not very well'"],
    tryThis: "Name what you think they are feeling before giving advice.",
    exampleReply: "That sounds really disappointing. Do you want to talk about it?",
    wrapup: "Sam was sad about the interview. Noticing that first is what helps most.",
  },
  sarcastic: {
    title: "The printer again",
    name: "Robin",
    emotion: "sarcastic",
    setup: "You work in the same office as Robin. Robin has just come back from the printer holding a crumpled sheet of paper.",
    lines: [
      "Printer's jammed again. Perfect timing, really.",
      "No, it's fine. It's only the third time this week.",
      "Yeah, I'm sure someone will fix it any day now.",
    ],
    hints: [
      "Robin says 'perfect timing', but the printer has just jammed. Listen to how flat it sounds.",
      "Robin is being sarcastic: the words sound fine, but Robin is actually fed up. Respond to that, not the words.",
    ],
    goodWords: ["annoying", "again", "frustrat", "fed up", "ugh", "help", "sorry", "rubbish", "not great"],
    cues: ["'perfect timing' said flatly", "'it's fine' about a third jam", "dry voice"],
    tryThis: "When the words sound too good for the situation, answer the real feeling behind them.",
    exampleReply: "Ugh, again? That's so annoying. Want me to take a look at it?",
    wrapup:
      "Robin was being sarcastic: saying 'perfect timing' and 'it's fine' while really being fed up. The trick is to notice when the words are nicer than the situation, and answer the real feeling.",
  },
} satisfies Record<string, Script>;

type ScriptName = keyof typeof SCRIPTS;

/** Which script a scenario came from, from its id. */
function scriptOf(scenario: Scenario): Script {
  return scenario.id.startsWith("mock-sarcastic-") ? SCRIPTS.sarcastic : SCRIPTS.sad;
}

function judge(script: Script, reply: string): Fit {
  const text = reply.toLowerCase();
  // Taking sarcasm at face value is the classic miss.
  if (script.emotion === "sarcastic" && /\b(great|nice|glad|awesome|good for you)\b/.test(text)) return "missed";
  const hits = script.goodWords.filter((w) => text.includes(w)).length;
  return hits >= 2 ? "in_tune" : hits === 1 ? "partly" : "missed";
}

export function mockStart(
  progress: ConversationProgress,
  length: ConversationLength = "quick",
  emotionSet: EmotionSet = "basics",
): ConversationResponse {
  const name: ScriptName = emotionSet === "basics" ? "sad" : "sarcastic";
  const script = SCRIPTS[name];
  const scenario: Scenario = {
    id: `mock-${name}-${Date.now()}`,
    title: script.title,
    characterName: script.name,
    emotion: script.emotion,
    turns: [
      { role: "narrator", text: script.setup },
      { role: "character", text: script.lines[0], emotion: script.emotion },
    ],
    exchanges: 0,
    done: false,
    length,
    emotionSet,
  };
  return { scenario, progress, mock: true };
}

export function mockReply(
  scenario: Scenario,
  text: string,
  progress: ConversationProgress,
  delivery?: ReplyDelivery,
): ConversationResponse {
  const script = scriptOf(scenario);
  const fit = judge(script, text);
  const usedHint = hintsThisTurn(scenario) > 0;
  const feeling = currentFeeling(scenario);
  // The script has no real judgement of tone: any measured spoken reply gets
  // the same example tone feedback, so the page can show it.
  const spoken = delivery?.measured.pitchHz != null;
  const feedback: Feedback = {
    fit,
    feeling,
    cues: script.cues,
    wentWell: fit === "missed" ? "You kept the conversation going." : `You picked up on how ${script.name} was really feeling.`,
    tryThis: script.tryThis,
    exampleReply: script.exampleReply,
    usedHint,
    tone: spoken
      ? {
          fit: "partly",
          heard: "seemed a little quick, at about your normal loudness",
          tip: `Try slowing down a little, so ${script.name} feels you have time for them.`,
        }
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
          ? { role: "wrapup", text: script.wrapup }
          : { role: "character", text: script.lines[exchanges % script.lines.length], emotion: script.emotion },
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
  const text = scriptOf(scenario).hints[level - 1];
  return {
    scenario: { ...scenario, turns: [...scenario.turns, { role: "hint", level, text }] },
    progress,
    mock: true,
  };
}
