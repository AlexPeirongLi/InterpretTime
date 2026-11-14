// A scripted stand-in for the AI, used by /api/chat when ANTHROPIC_API_KEY is
// not set. It lets the pages be built and tested before the real AI is wired
// up. It follows the same shapes as the real route but is not smart: it judges
// answers by looking for a few keywords.

import type {
  AiTurn,
  Attempt,
  ChatResponse,
  CueKind,
  Emotion,
  Profile,
  Segment,
  Turn,
} from "./types";

type Practice = { emotion: Emotion; kind: CueKind; phrase: string };

const SCRIPT: Practice[] = [
  { emotion: "angry", kind: "both", phrase: "I told you not to touch my things." },
  { emotion: "sad", kind: "tone", phrase: "I'll be home late tonight." },
  { emotion: "happy", kind: "words", phrase: "I'm so glad you came." },
  { emotion: "afraid", kind: "tone", phrase: "Someone is at the door." },
];

const KEYWORDS: Record<Emotion, string[]> = {
  happy: ["happy", "glad", "cheerful", "excited", "pleased", "joy"],
  sad: ["sad", "down", "unhappy", "upset", "disappointed", "low"],
  angry: ["angry", "mad", "annoyed", "furious", "cross", "irritated"],
  afraid: ["afraid", "scared", "fear", "nervous", "worried", "anxious"],
  neutral: ["neutral", "calm", "normal", "flat", "nothing"],
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
  return [
    say("Listen to how I say this."),
    practiceSegment(p),
    say("How did that sound to you?"),
  ];
}

export function mockChat(history: Turn[], profile: Profile): ChatResponse {
  const answered = history.filter((t) => t.role === "user").length;

  if (answered === 0) {
    const reply: AiTurn = {
      role: "ai",
      segments: [
        say(
          "Hi. I'm your practice partner. I'll say a sentence, and you tell me how it sounds. There are no wrong answers.",
        ),
        ...ask(SCRIPT[0]),
      ],
    };
    return { reply, profile, mock: true };
  }

  const lastUser = history.findLast((t) => t.role === "user");
  const answer = lastUser?.role === "user" ? lastUser.text : "";
  const previous = SCRIPT[(answered - 1) % SCRIPT.length];
  const next = SCRIPT[answered % SCRIPT.length];

  const recognised = KEYWORDS[previous.emotion].some((word) =>
    answer.toLowerCase().includes(word),
  );
  const attempt: Attempt = { ...previous, recognised, heardAs: answer };

  const feedback: Segment[] = recognised
    ? [say(`Yes. That was ${previous.emotion}. You heard it.`)]
    : [
        say(`That one was ${previous.emotion}. Here it is next to a calm voice.`),
        say(previous.phrase, "neutral"),
        say(previous.phrase, previous.emotion),
      ];

  return {
    reply: { role: "ai", segments: [...feedback, ...ask(next)] },
    profile: { attempts: [...profile.attempts, attempt] },
    mock: true,
  };
}
