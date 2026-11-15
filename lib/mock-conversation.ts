// A scripted stand-in for the AI in conversation mode, used by
// /api/conversation when ANTHROPIC_API_KEY is not set. It lets the page be
// built and tested before the real AI works, and costs nothing to run. It
// follows the same shapes as the real route but is not smart: it judges
// replies by looking for a few words.

import { currentFeeling, hintsThisTurn, pendingPractice, repliesFor, shouldStepIn } from "./conversation";
import { EMOTION_LABELS } from "./emotions";
import {
  HINTS_PER_TURN,
  type ConversationLength,
  type ConversationProgress,
  type CopyCheckRequest,
  type CopyCheckResponse,
  type ConversationResponse,
  type Emotion,
  type EmotionSet,
  type Feedback,
  type Fit,
  type PracticeTurn,
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
  angry: {
    title: "The group chat",
    name: "Jordan",
    emotion: "angry",
    setup:
      "You're round at Jordan's, and Jordan's phone keeps buzzing. They finally pick it up, read it, and put it face down on the table.",
    lines: [
      "Honestly, I'm so done with that group chat.",
      "They just keep bringing up the same thing over and over.",
      "I don't even want to look at my phone right now.",
    ],
    hints: [
      "Listen to how sharp and clipped Jordan's voice is, and how fast they're talking.",
      "Jordan sounds angry, not just annoyed. They might need a minute before they want advice.",
    ],
    goodWords: ["annoying", "frustrat", "angry", "wind you up", "sounds awful", "want to talk", "that's rough", "fair enough"],
    cues: ["sharp, clipped voice", "putting the phone face down", "'so done with'"],
    tryThis: "Let them vent first, before jumping to fixing it.",
    exampleReply: "That sounds really frustrating. Do you want to vent, or would it help to put your phone away for a bit?",
    wrapup: "Jordan was angry about the group chat. Giving them space to vent first is often more useful than jumping straight to advice.",
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
  disappointed: {
    title: "The audition results",
    name: "Priya",
    emotion: "disappointed",
    setup: "Priya just checked the noticeboard for the audition results and walks back over to you.",
    lines: [
      "Oh. Well, it is what it is, I guess.",
      "No, it's fine, I wasn't that bothered anyway.",
      "I mean, there's always next year. Whatever.",
    ],
    hints: [
      "Priya says 'it's fine', but listen to how flat and quiet her voice is.",
      "Priya is disappointed, even though her words say she doesn't mind. The 'whatever' is covering something.",
    ],
    goodWords: ["disappoint", "sorry", "sucks", "that's rough", "hard", "really wanted", "unfair", "feel"],
    cues: ["flat, quiet voice", "'it is what it is'", "'whatever' at the end"],
    tryThis: "When someone says they don't mind but sounds flat, it's often worth naming the disappointment anyway.",
    exampleReply: "I'm sorry, that's really disappointing, even if you don't want to make a big thing of it.",
    wrapup: "Priya said she didn't mind, but she was disappointed about the audition. The flat voice was the real signal, not the words.",
  },
} satisfies Record<string, Script>;

type ScriptName = keyof typeof SCRIPTS;

const BASIC_SCRIPTS: ScriptName[] = ["sad", "angry"];
const DEEPER_SCRIPTS: ScriptName[] = ["sarcastic", "disappointed"];

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/** Which script a scenario came from, from its id. */
function scriptOf(scenario: Scenario): Script {
  const name = (Object.keys(SCRIPTS) as ScriptName[]).find((key) => scenario.id.startsWith(`mock-${key}-`));
  return SCRIPTS[name ?? "sad"];
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
  const name = pick(emotionSet === "basics" ? BASIC_SCRIPTS : DEEPER_SCRIPTS);
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
  const toneJudged = spoken && fit === "in_tune";
  const feedback: Feedback = {
    fit,
    feeling,
    cues: script.cues,
    wentWell: fit === "missed" ? "You kept the conversation going." : `You picked up on how ${script.name} was really feeling.`,
    tryThis: script.tryThis,
    exampleReply: script.exampleReply,
    usedHint,
    // Words first: tone is only judged when the words were in tune.
    tone: toneJudged
      ? {
          fit: "partly",
          heard: "seemed a little quick, at about your normal loudness",
          tip: `Try slowing down a little, so ${script.name} feels you have time for them.`,
          better: "softer, a little slower and warm",
        }
      : null,
  };
  const exchanges = scenario.exchanges + 1;
  const done = exchanges >= repliesFor(scenario);
  const characterLine = { text: script.lines[exchanges % script.lines.length], emotion: script.emotion };
  // Two replies in a row not in tune: pause and practise (see STEP-IN.md).
  const practice: PracticeTurn | null = shouldStepIn(scenario, fit, done)
    ? {
        role: "practice",
        intro: `Let's pause for a moment. ${script.name} seems ${EMOTION_LABELS[feeling].toLowerCase()}. Here's one way you could reply. Listen, then say it back the same way.`,
        line: script.exampleReply,
        delivery: "soft, slow and warm",
        feeling,
        tries: 0,
        outcome: "pending",
        heldLine: characterLine,
      }
    : null;

  return {
    scenario: {
      ...scenario,
      exchanges,
      done,
      turns: [
        ...scenario.turns,
        { role: "user", text },
        { role: "feedback", feedback },
        done ? { role: "wrapup", text: script.wrapup } : (practice ?? { role: "character", ...characterLine }),
      ],
    },
    progress: {
      ...progress,
      results: [...progress.results, { emotion: feeling, fit, usedHint, ...(toneJudged ? { toneFit: "partly" as const } : {}) }],
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

/** Ends a step-in in the scripted mode: copied gets the next scripted line, skipped the held one. */
export function mockFinishPractice(
  scenario: Scenario,
  progress: ConversationProgress,
  outcome: "copied" | "skipped",
): ConversationResponse {
  const practice = pendingPractice(scenario);
  if (!practice) throw new Error("There is no step-in to finish.");
  const index = scenario.turns.lastIndexOf(practice);
  const turns = scenario.turns.map((t, i) => (i === index ? { ...practice, outcome } : t));
  const stepIns = progress.stepIns ?? { copied: 0, skipped: 0 };
  const script = scriptOf(scenario);
  const copiedLine = { text: script.lines[(scenario.exchanges + 1) % script.lines.length], emotion: script.emotion };
  return {
    scenario: {
      ...scenario,
      turns:
        outcome === "copied"
          ? [...turns, { role: "user", text: practice.line, practised: true }, { role: "character", ...copiedLine }]
          : [...turns, { role: "character", ...practice.heldLine }],
    },
    progress: { ...progress, stepIns: { ...stepIns, [outcome]: stepIns[outcome] + 1 } },
    mock: true,
  };
}

/** The scripted copy check: not quite on the first try, right on the second. */
export function mockCopyCheck(req: CopyCheckRequest): CopyCheckResponse {
  if (req.attempt.measured.pitchHz == null) {
    return { matched: false, heard: "", nudge: "I couldn't hear your voice clearly that time. Try again a little closer to the microphone.", mock: true };
  }
  return req.tryNumber >= 2
    ? { matched: true, heard: "seemed softer and slower", nudge: "That's it. That sounded caring.", mock: true }
    : { matched: false, heard: "seemed a little quick", nudge: "Nearly. Try it a little slower and softer.", mock: true };
}
