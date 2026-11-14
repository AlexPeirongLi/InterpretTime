import { z } from "zod";
import { CUE_KINDS, EMOTIONS } from "@/lib/emotions";
import type { ChatRequest, ConversationRequest, SpeakRequest } from "@/lib/types";
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

export const chatRequestSchema: z.ZodType<ChatRequest> = z.object({
  history: z.array(turn).max(200),
  profile: z.object({ attempts: z.array(attempt).max(500) }),
});

export const speakRequestSchema: z.ZodType<SpeakRequest> = z.object({
  segments: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(MAX_SEGMENT_CHARS),
        emotion,
        voice: z.enum(["narrator", "character"]).optional(),
      }),
    )
    .min(1)
    .max(MAX_SEGMENTS),
});

// --- Conversation mode -------------------------------------------------------

const MAX_TEXT = 1000;
const fit = z.enum(["in_tune", "partly", "missed"]);

const feedback = z.object({
  fit,
  feeling: emotion,
  cues: z.array(z.string().max(MAX_TEXT)).max(5),
  wentWell: z.string().max(MAX_TEXT),
  tryThis: z.string().max(MAX_TEXT),
  exampleReply: z.string().max(MAX_TEXT),
  usedHint: z.boolean(),
});

const scenarioTurn = z.discriminatedUnion("role", [
  z.object({ role: z.literal("narrator"), text: z.string().max(MAX_TEXT) }),
  z.object({ role: z.literal("character"), text: z.string().max(MAX_TEXT), emotion }),
  z.object({ role: z.literal("user"), text: z.string().max(2000) }),
  z.object({ role: z.literal("feedback"), feedback }),
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
});

const progress = z.object({
  results: z.array(z.object({ emotion, fit, usedHint: z.boolean() })).max(1000),
});

export const conversationRequestSchema: z.ZodType<ConversationRequest> = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), progress }),
  z.object({
    action: z.literal("reply"),
    scenario,
    text: z.string().trim().min(1).max(2000),
    progress,
  }),
  z.object({ action: z.literal("hint"), scenario, progress }),
]);

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
