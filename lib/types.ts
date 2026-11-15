// The contract between the website (Person B) and the server routes (Person A).
// See PLAN.md. Do not change these shapes without telling the other person.

export type Emotion =
  // Basics
  | "happy"
  | "sad"
  | "angry"
  | "afraid"
  | "neutral"
  // Deeper (see DEEPER-EMOTIONS.md)
  | "sarcastic"
  | "frustrated"
  | "disappointed"
  | "nervous"
  | "excited"
  | "embarrassed"
  | "bored"
  | "relieved";

/** Which emotions to practise. Missing means "basics". */
export type EmotionSet = "basics" | "both" | "deeper";

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
export type ChatRequest = { history: Turn[]; profile: Profile; emotionSet?: EmotionSet };
export type ChatResponse = { reply: AiTurn; profile: Profile; mock: boolean };

// Which voice speaks a segment. Conversation mode uses both; Quickfire only
// uses the narrator.
// "user" is a copy of the person's own voice (see YOUR-VOICE.md).
export type Voice = "narrator" | "character" | "user";

// POST /api/speak (JSON) -> audio/mpeg bytes. A missing voice means "narrator".
export type SpeakRequest = {
  segments: (Pick<Segment, "text" | "emotion"> & {
    voice?: Voice;
    /**
     * How to say it, in a few plain words ("softer, slower and warm"). Replaces
     * the emotion's usual voice instruction. Used for "Hear it in your voice".
     */
    delivery?: string;
  })[];
  /** Needed when a segment uses voice "user": the ID from /api/voice-copy. */
  userVoiceId?: string;
};

// POST /api/voice-copy (multipart: file field "audio", field "consent" = "yes")
//   -> JSON VoiceCopyResponse. Makes a copy of the person's voice.
// DELETE /api/voice-copy (JSON { voiceId }) -> JSON { deleted: true }.
export type VoiceCopyResponse = { voiceId: string; mock: boolean };

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
  /** practised: true when this is a line copied during a step-in. */
  | { role: "user"; text: string; practised?: boolean }
  | { role: "feedback"; feedback: Feedback }
  | { role: "hint"; level: 1 | 2; text: string }
  | { role: "wrapup"; text: string }
  /** A step-in after two replies in a row that weren't in tune. See STEP-IN.md. */
  | PracticeTurn;

export type PracticeTurn = {
  role: "practice";
  /** The narrator's pause, e.g. "Let's pause. Robin seems sad. Here's one way you could reply." */
  intro: string;
  /** A good reply for the person to copy. */
  line: string;
  /** How to say it, in a few plain words ("soft, slow and warm"). */
  delivery: string;
  /** What the character was feeling. */
  feeling: Emotion;
  /** Attempts so far. */
  tries: number;
  outcome: "pending" | "copied" | "skipped";
  /** The character's answer to the original reply, used if the person moves on without copying. */
  heldLine: { text: string; emotion: Emotion };
};

export type Scenario = {
  id: string;
  /** e.g. "After the interview". Safe to show. */
  title: string;
  /** e.g. "Sam". */
  characterName: string;
  /** What the character feels. The answer: do not show before feedback. */
  emotion: Emotion;
  turns: ScenarioTurn[];
  /** Replies the person has made so far. */
  exchanges: number;
  /** True after the wrap-up. */
  done: boolean;
  /** How long the conversation lasts. Missing on older saved scenarios: "quick". */
  length?: ConversationLength;
  /** Which emotions this conversation uses. Missing means "basics". */
  emotionSet?: EmotionSet;
};

/** How many replies a conversation lasts. Feedback is shown at the end. */
export type ConversationLength = "quick" | "medium" | "full";
export const REPLIES_BY_LENGTH: Record<ConversationLength, number> = { quick: 3, medium: 5, full: 8 };

export type ConversationResult = {
  emotion: Emotion;
  fit: Fit;
  usedHint: boolean;
  /** How well the tone fitted. Only for spoken replies. */
  toneFit?: Fit;
};
export type ConversationProgress = {
  results: ConversationResult[];
  /** Step-ins so far: how many were copied, and how many moved on from. */
  stepIns?: { copied: number; skipped: number };
};

// POST /api/conversation (JSON)
export type ConversationRequest =
  | { action: "start"; progress: ConversationProgress; length?: ConversationLength; emotionSet?: EmotionSet }
  | {
      action: "reply";
      scenario: Scenario;
      text: string;
      progress: ConversationProgress;
      /** Only for spoken replies. */
      delivery?: ReplyDelivery;
    }
  | { action: "hint"; scenario: Scenario; progress: ConversationProgress }
  /**
   * Ends a step-in. "copied": the person copied the line, which becomes their
   * reply and the character answers it. "skipped": they moved on for now.
   */
  | { action: "practised"; scenario: Scenario; progress: ConversationProgress; outcome: "copied" | "skipped" };

// POST /api/copy-check (JSON): did a spoken attempt at a step-in line come
// across in the right tone? The words are checked on the page first.
export type CopyCheckRequest = {
  line: string;
  /** The tone to aim for, e.g. "soft, slow and warm". */
  target: string;
  feeling: Emotion;
  attempt: ReplyDelivery;
  /** Which try this is, from 1. */
  tryNumber: number;
};
export type CopyCheckResponse = {
  matched: boolean;
  /** How it seemed to come across, e.g. "a little quick". Empty if it couldn't be measured. */
  heard: string;
  /** One short sentence: what to change, or well done. */
  nudge: string;
  mock: boolean;
};

/** Always the whole updated scenario. The page replaces its copy. */
export type ConversationResponse = {
  scenario: Scenario;
  progress: ConversationProgress;
  mock: boolean;
};

/** Replies per scenario before the wrap-up, for a "quick" conversation. */
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
  /**
   * When the tone didn't fit: how it would have fitted, in a few plain words
   * ("softer, slower and warm"). Used to say their sentence in their own voice.
   */
  better?: string | null;
};
