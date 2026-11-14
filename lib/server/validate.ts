import { z } from "zod";
import { CUE_KINDS, EMOTIONS } from "@/lib/emotions";
import type { ChatRequest, SpeakRequest } from "@/lib/types";
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
      }),
    )
    .min(1)
    .max(MAX_SEGMENTS),
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
