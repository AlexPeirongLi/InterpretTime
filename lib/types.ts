// The contract between the website (Person B) and the server routes (Person A).
// See PLAN.md. Do not change these shapes without telling the other person.

export type Emotion = "happy" | "sad" | "angry" | "afraid" | "neutral";

// What carries the emotion in a practice sentence:
// "words" = emotional words in a flat voice, "tone" = plain words in an
// emotional voice, "both" = emotional words in a matching voice.
export type CueKind = "words" | "tone" | "both";

// One part of what the AI says, spoken in one tone.
export type Segment = {
  text: string;
  /** The tone it is spoken in. */
  emotion: Emotion;
  /** True for the practice sentence the person is being asked about. */
  example: boolean;
};

export type AiTurn = { role: "ai"; segments: Segment[] };
export type UserTurn = { role: "user"; text: string };
export type Turn = AiTurn | UserTurn;

// One practice sentence the person has responded to.
export type Attempt = {
  /** What it really was. For kind "words" this is the emotion of the words. */
  emotion: Emotion;
  kind: CueKind;
  phrase: string;
  recognised: boolean;
  /** What the person said it sounded like, in their words. */
  heardAs: string;
};

export type Profile = { attempts: Attempt[] };

// POST /api/chat (JSON). An empty history starts the conversation.
export type ChatRequest = { history: Turn[]; profile: Profile };
export type ChatResponse = { reply: AiTurn; profile: Profile; mock: boolean };

// Which voice speaks a segment. Conversation mode uses both; Quickfire only
// uses the narrator.
export type Voice = "narrator" | "character";

// POST /api/speak (JSON) -> audio/mpeg bytes. A missing voice means "narrator".
export type SpeakRequest = {
  segments: (Pick<Segment, "text" | "emotion"> & { voice?: Voice })[];
};

// POST /api/transcribe (multipart form, file field "audio") -> JSON
export type TranscribeResponse = { text: string };

// Any route on failure: this body with status 400 (bad input),
// 503 (API key not set) or 502 (ElevenLabs or Claude failed).
export type ApiError = { error: string };

// ---------------------------------------------------------------------------
// Conversation mode. See CONVERSATION-MODE.md.
// ---------------------------------------------------------------------------

/** How well the person's reply fitted what the other person was feeling. */
export type Fit = "in_tune" | "partly" | "missed";

export type Feedback = {
  fit: Fit;
  /** What the other person was feeling. */
  feeling: Emotion;
  /** 1-3 things that showed it, e.g. "slow, quiet voice". */
  cues: string[];
  /** One sentence. */
  wentWell: string;
  /** One sentence. */
  tryThis: string;
  /** A reply that would have fitted better. */
  exampleReply: string;
  usedHint: boolean;
  /** How the reply sounded. Only for spoken replies; see TONE-CHECK.md. */
  tone?: ToneFeedback | null;
};

export type ScenarioTurn =
  /** Spoken in the calm narrator voice. */
  | { role: "narrator"; text: string }
  /** Spoken in the character voice, in this emotion. */
  | { role: "character"; text: string; emotion: Emotion }
  | { role: "user"; text: string }
  | { role: "feedback"; feedback: Feedback }
  | { role: "hint"; level: 1 | 2; text: string }
  | { role: "wrapup"; text: string };

export type Scenario = {
  id: string;
  /** e.g. "After the interview". Safe to show. */
  title: string;
  /** e.g. "Sam". */
  characterName: string;
  /** What the character feels. The answer: do not show before feedback. */
  emotion: Emotion;
  turns: ScenarioTurn[];
  /** Replies the person has made so far, 0-3. */
  exchanges: number;
  /** True after the wrap-up. */
  done: boolean;
};

export type ConversationResult = {
  emotion: Emotion;
  fit: Fit;
  usedHint: boolean;
  /** How well the tone fitted. Only for spoken replies. */
  toneFit?: Fit;
};
export type ConversationProgress = { results: ConversationResult[] };

// POST /api/conversation (JSON)
export type ConversationRequest =
  | { action: "start"; progress: ConversationProgress }
  | {
      action: "reply";
      scenario: Scenario;
      text: string;
      progress: ConversationProgress;
      /** Only for spoken replies. */
      delivery?: ReplyDelivery;
    }
  | { action: "hint"; scenario: Scenario; progress: ConversationProgress };

/** Always the whole updated scenario. The page replaces its copy. */
export type ConversationResponse = {
  scenario: Scenario;
  progress: ConversationProgress;
  mock: boolean;
};

/** Replies per scenario before the wrap-up. */
export const EXCHANGES_PER_SCENARIO = 3;
/** Hints available per reply. */
export const HINTS_PER_TURN = 2;

// ---------------------------------------------------------------------------
// Tone check: how the person's spoken reply sounded. See TONE-CHECK.md.
// ---------------------------------------------------------------------------

/** What lib/delivery.ts measures from one recording. */
export type Delivery = {
  /** The whole recording. */
  seconds: number;
  /** Time actually speaking, pauses removed. */
  speechSeconds: number;
  /** Typical pitch. Null if there was too little voice to measure. */
  pitchHz: number | null;
  /** How much the pitch rises and falls, in semitones. */
  pitchRange: number | null;
  /** Typical loudness in dB, relative to the microphone (so only comparable on the same setup). */
  loudnessDb: number;
  /** How much the loudness changes, in dB. */
  loudnessRange: number;
  /** Pauses longer than half a second. */
  pauses: number;
  /** Seconds. */
  longestPause: number;
};

/** The person's normal voice: the same measurements from a plain sentence. */
export type Baseline = Delivery & { wordsPerSecond: number };

export type ReplyDelivery = {
  measured: Delivery;
  /** Words spoken in this recording, from its transcript. */
  words: number;
  baseline: Baseline | null;
};

export type ToneFeedback = {
  fit: Fit;
  /** How they seemed to sound, e.g. "quick and fairly loud". */
  heard: string;
  /** One sentence. */
  tip: string;
};
