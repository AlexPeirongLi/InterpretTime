import { transcribe } from "@/lib/server/elevenlabs";
import { env, UpstreamError } from "@/lib/server/env";
import { jsonError } from "@/lib/server/http";
import type { TranscribeResponse } from "@/lib/types";

// Give the AI and voice calls room when hosted: free hosting may otherwise
// stop a request after about 10 seconds. 60 is the free plan's maximum.
export const maxDuration = 60;

// A spoken answer is a few seconds long. This is generous.
const MAX_BYTES = 10 * 1024 * 1024;

// POST /api/transcribe — a recording in the form field "audio" in, text out.
export async function POST(request: Request): Promise<Response> {
  let audio: FormDataEntryValue | null;
  try {
    audio = (await request.formData()).get("audio");
  } catch {
    return jsonError(400, 'Send the recording as a form with a file field named "audio".');
  }
  if (!(audio instanceof File) || audio.size === 0) {
    return jsonError(400, 'The form needs a recording in a file field named "audio".');
  }
  if (audio.size > MAX_BYTES) {
    return jsonError(400, "The recording is too large. Keep it under 10 MB.");
  }

  const apiKey = env.elevenLabsKey;
  if (!apiKey) return jsonError(503, "Voice is not set up yet.");

  try {
    const text = await transcribe(apiKey, audio);
    return Response.json({ text } satisfies TranscribeResponse);
  } catch (error) {
    if (error instanceof UpstreamError) return jsonError(502, error.message);
    console.error("Transcribe route failed:", error);
    return jsonError(502, "Could not understand the recording.");
  }
}
