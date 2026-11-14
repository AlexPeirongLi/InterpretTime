// A scripted stand-in for the AI, used by /api/chat when ANTHROPIC_API_KEY is
// not set. It lets the pages be built and tested before the real AI is wired
// up, and costs nothing to run. It follows the same shapes as the real route
// but is not smart: it judges answers by looking for a few keywords.

import { CLOSEST_BASIC, isDeeper } from "./emotions";
import type {
  AiTurn,
  Attempt,
  ChatResponse,
  CueKind,
  Emotion,
  EmotionSet,
  Profile,
  Segment,
  Turn,
} from "./types";

type Practice = { emotion: Emotion; kind: CueKind; phrase: string };

const BASIC_SCRIPT: Practice[] = [
  { emotion: "angry", kind: "both", phrase: "I told you not to touch my things." },
  { emotion: "sad", kind: "tone", phrase: "I'll be home late tonight." },
  { emotion: "happy", kind: "words", phrase: "I'm so glad you came." },
  { emotion: "afraid", kind: "tone", phrase: "Someone is at the door." },
];

const DEEPER_SCRIPT: Practice[] = [
  { emotion: "sarcastic", kind: "tone", phrase: "Oh, great. Another meeting." },
  { emotion: "disappointed", kind: "both", phrase: "Oh. They picked someone else." },
  { emotion: "nervous", kind: "tone", phrase: "I've got my driving test tomorrow." },
  { emotion: "bored", kind: "tone", phrase: "Yeah. Sounds fine." },
];

const SCRIPTS: Record<EmotionSet, Practice[]> = {
  basics: BASIC_SCRIPT,
  deeper: DEEPER_SCRIPT,
  // Alternate, starting with a basic one.
  both: BASIC_SCRIPT.flatMap((p, i) => [p, DEEPER_SCRIPT[i]]),
};

const KEYWORDS: Record<Emotion, string[]> = {
  happy: ["happy", "glad", "cheerful", "excited", "pleased", "joy"],
  sad: ["sad", "down", "unhappy", "upset", "disappointed", "low"],
  angry: ["angry", "mad", "annoyed", "furious", "cross", "irritated"],
  afraid: ["afraid", "scared", "fear", "nervous", "worried", "anxious"],
  neutral: ["neutral", "calm", "normal", "flat", "nothing"],
  sarcastic: ["sarcastic", "sarcasm", "didn't mean", "not mean", "fake", "ironic", "opposite"],
  frustrated: ["frustrated", "fed up", "annoyed", "exasperated"],
  disappointed: ["disappointed", "let down", "letdown"],
  nervous: ["nervous", "anxious", "worried", "jittery"],
  excited: ["excited", "can't wait", "thrilled", "pumped"],
  embarrassed: ["embarrassed", "awkward", "ashamed", "cringe"],
  bored: ["bored", "uninterested", "boring", "doesn't care", "meh"],
  relieved: ["relieved", "relief", "phew"],
};

const say = (text: string, emotion: Emotion = "neutral"): Segment => ({
  text,
  emotion,
  example: false,
});

/** A practice sentence. For kind "words" the voice stays flat. */
function practiceSegment(p: Practice): Segment {
  return {
    text: p.phrase,
    emotion: p.kind === "words" ? "neutral" : p.emotion,
    example: true,
  };
}

function ask(p: Practice): Segment[] {
  return [say("Listen to how I say this."), practiceSegment(p), say("How did that sound to you?")];
}

/** The practice sentence the person was last asked about, found by its words. */
function lastPractice(history: Turn[]): Practice | null {
  const lastAi = history.findLast((t) => t.role === "ai");
  const example = lastAi?.role === "ai" ? lastAi.segments.find((s) => s.example) : undefined;
  if (!example) return null;
  return [...BASIC_SCRIPT, ...DEEPER_SCRIPT].find((p) => p.phrase === example.text) ?? null;
}

/** How a missed emotion is shown: next to its closest basic one, or next to calm. */
function comparison(p: Practice): Segment[] {
  if (p.emotion === "sarcastic") {
    return [
      say("That one was sarcastic: the words sound nice, but they meant the opposite. Here it is said sincerely, then sarcastically."),
      say(p.phrase.replace(/\.\s/, "! ").replace(/\.$/, "!"), "happy"),
      say(p.phrase, "sarcastic"),
    ];
  }
  const anchor = isDeeper(p.emotion) ? CLOSEST_BASIC[p.emotion as keyof typeof CLOSEST_BASIC] : "neutral";
  return [
    say(`That one was ${p.emotion}. Here it is next to ${anchor}, the feeling it's closest to.`),
    say(p.phrase, anchor),
    say(p.phrase, p.emotion),
  ];
}

export function mockChat(history: Turn[], profile: Profile, set: EmotionSet = "basics"): ChatResponse {
  const script = SCRIPTS[set];
  const answered = history.filter((t) => t.role === "user").length;
  const next = script[answered % script.length];

  if (answered === 0) {
    const reply: AiTurn = {
      role: "ai",
      segments: [
        say("Hi. I'm your practice partner. I'll say a sentence, and you tell me how it sounds. There are no wrong answers."),
        ...ask(next),
      ],
    };
    return { reply, profile, mock: true };
  }

  const lastUser = history.findLast((t) => t.role === "user");
  const answer = lastUser?.role === "user" ? lastUser.text.toLowerCase() : "";
  const previous = lastPractice(history);
  if (!previous) {
    return { reply: { role: "ai", segments: ask(next) }, profile, mock: true };
  }

  const recognised = KEYWORDS[previous.emotion].some((word) => answer.includes(word));
  const attempt: Attempt = { ...previous, recognised, heardAs: lastUser?.role === "user" ? lastUser.text : "" };
  const feedback = recognised ? [say(`Yes. That was ${previous.emotion}. You heard it.`)] : comparison(previous);

  return {
    reply: { role: "ai", segments: [...feedback, ...ask(next)] },
    profile: { attempts: [...profile.attempts, attempt] },
    mock: true,
  };
}
