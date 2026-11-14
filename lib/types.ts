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

// POST /api/speak (JSON) -> audio/mpeg bytes
export type SpeakRequest = { segments: Pick<Segment, "text" | "emotion">[] };

// POST /api/transcribe (multipart form, file field "audio") -> JSON
export type TranscribeResponse = { text: string };

// Any route on failure: this body with status 400 (bad input),
// 503 (API key not set) or 502 (ElevenLabs or Claude failed).
export type ApiError = { error: string };
