import { z } from "zod";
import { CUE_KINDS, EMOTION_SETS, EMOTIONS } from "@/lib/emotions";
import type { ChatRequest, ConversationRequest, CopyCheckRequest, SpeakRequest } from "@/lib/types";
import { jsonError } from "./http";

// Size limits keep one request from using a large amount of API credit.
const MAX_SEGMENT_CHARS = 600;
const MAX_SEGMENTS = 12;

const emotion = z.enum(EMOTIONS);

const segment = z.object({
  text: z.string().min(1).max(MAX_SEGMENT_CHARS),
  emotion,
  example: z.boolean(),
});

const turn = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("ai"),
    segments: z.array(segment).min(1).max(MAX_SEGMENTS),
  }),
  z.object({ role: z.literal("user"), text: z.string().max(2000) }),
]);

const attempt = z.object({
  emotion,
  kind: z.enum(CUE_KINDS),
  phrase: z.string().max(MAX_SEGMENT_CHARS),
  recognised: z.boolean(),
  heardAs: z.string().max(2000),
});

const emotionSet = z.enum(EMOTION_SETS);

export const chatRequestSchema: z.ZodType<ChatRequest> = z.object({
  history: z.array(turn).max(200),
  profile: z.object({ attempts: z.array(attempt).max(500) }),
  emotionSet: emotionSet.optional(),
});

/**
 * A few plain words describing how to say something. Letters, spaces, commas,
 * hyphens and apostrophes only, so it can't add its own voice instructions.
 */
export const deliveryText = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-zA-Z ,'-]+$/, "Use plain words only, like 'softer, slower and warm'.");

/** An ElevenLabs voice ID. */
export const voiceId = z.string().regex(/^[A-Za-z0-9]{10,40}$/, "That is not a voice ID.");

export const speakRequestSchema: z.ZodType<SpeakRequest> = z
  .object({
    segments: z
      .array(
        z.object({
          text: z.string().trim().min(1).max(MAX_SEGMENT_CHARS),
          emotion,
          voice: z.enum(["narrator", "character", "user"]).optional(),
          delivery: deliveryText.optional(),
        }),
      )
      .min(1)
      .max(MAX_SEGMENTS),
    userVoiceId: voiceId.optional(),
  })
  .refine((req) => !req.segments.some((s) => s.voice === "user") || req.userVoiceId, {
    message: "Speaking in your own voice needs the ID of your voice copy.",
    path: ["userVoiceId"],
  });

// --- Conversation mode -------------------------------------------------------

const MAX_TEXT = 1000;
const fit = z.enum(["in_tune", "partly", "missed"]);
const conversationLength = z.enum(["quick", "medium", "full"]);

const feedback = z.object({
  fit,
  feeling: emotion,
  cues: z.array(z.string().max(MAX_TEXT)).max(5),
  wentWell: z.string().max(MAX_TEXT),
  tryThis: z.string().max(MAX_TEXT),
  exampleReply: z.string().max(MAX_TEXT),
  usedHint: z.boolean(),
  tone: z
    .object({
      fit,
      heard: z.string().max(MAX_TEXT),
      tip: z.string().max(MAX_TEXT),
      better: z.string().max(MAX_TEXT).nullable().optional(),
    })
    .nullable()
    .optional(),
});

const scenarioTurn = z.discriminatedUnion("role", [
  z.object({ role: z.literal("narrator"), text: z.string().max(MAX_TEXT) }),
  z.object({ role: z.literal("character"), text: z.string().max(MAX_TEXT), emotion }),
  z.object({ role: z.literal("user"), text: z.string().max(2000), practised: z.boolean().optional() }),
  z.object({ role: z.literal("feedback"), feedback }),
  z.object({
    role: z.literal("practice"),
    intro: z.string().max(MAX_TEXT),
    line: z.string().max(MAX_TEXT),
    delivery: z.string().max(MAX_TEXT),
    feeling: emotion,
    tries: z.number().int().min(0).max(100),
    outcome: z.enum(["pending", "copied", "skipped"]),
    heldLine: z.object({ text: z.string().max(MAX_TEXT), emotion }),
  }),
  z.object({ role: z.literal("hint"), level: z.union([z.literal(1), z.literal(2)]), text: z.string().max(MAX_TEXT) }),
  z.object({ role: z.literal("wrapup"), text: z.string().max(MAX_TEXT) }),
]);

const scenario = z.object({
  id: z.string().max(100),
  title: z.string().max(200),
  characterName: z.string().max(100),
  emotion,
  turns: z.array(scenarioTurn).max(60),
  exchanges: z.number().int().min(0).max(10),
  done: z.boolean(),
  length: conversationLength.optional(),
  emotionSet: z.enum(EMOTION_SETS).optional(),
});

const progress = z.object({
  results: z.array(z.object({ emotion, fit, usedHint: z.boolean(), toneFit: fit.optional() })).max(1000),
  stepIns: z.object({ copied: z.number().int().min(0), skipped: z.number().int().min(0) }).optional(),
});

// Voice measurements. The bounds only reject nonsense; real values sit well inside.
const seconds = z.number().min(0).max(600);
const delivery = z.object({
  seconds,
  speechSeconds: seconds,
  pitchHz: z.number().min(30).max(1000).nullable(),
  pitchRange: z.number().min(0).max(48).nullable(),
  loudnessDb: z.number().min(-200).max(20),
  loudnessRange: z.number().min(0).max(200),
  pauses: z.number().int().min(0).max(1000),
  longestPause: seconds,
});

const replyDelivery = z.object({
  measured: delivery,
  words: z.number().int().min(0).max(2000),
  baseline: delivery.extend({ wordsPerSecond: z.number().min(0).max(20) }).nullable(),
});

export const conversationRequestSchema: z.ZodType<ConversationRequest> = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    progress,
    length: conversationLength.optional(),
    emotionSet: emotionSet.optional(),
  }),
  z.object({
    action: z.literal("reply"),
    scenario,
    text: z.string().trim().min(1).max(2000),
    progress,
    delivery: replyDelivery.optional(),
  }),
  z.object({ action: z.literal("hint"), scenario, progress }),
  z.object({ action: z.literal("practised"), scenario, progress, outcome: z.enum(["copied", "skipped"]) }),
]);

export const copyCheckRequestSchema: z.ZodType<CopyCheckRequest> = z.object({
  line: z.string().trim().min(1).max(MAX_TEXT),
  target: deliveryText,
  feeling: emotion,
  attempt: replyDelivery,
  tryNumber: z.number().int().min(1).max(100),
});

/** Reads and checks a JSON body. Returns the data, or the 400 to send back. */
export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: jsonError(400, "The request body is not valid JSON.") };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue.path.join(".") || "body";
    return { response: jsonError(400, `Bad request at ${where}: ${issue.message}`) };
  }
  return { data: result.data };
}
