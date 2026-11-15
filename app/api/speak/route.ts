import { speak } from "@/lib/server/elevenlabs";
import { env, UpstreamError } from "@/lib/server/env";
import { jsonError } from "@/lib/server/http";
import { readJson, speakRequestSchema } from "@/lib/server/validate";

// Give the AI and voice calls room when hosted: free hosting may otherwise
// stop a request after about 10 seconds. 60 is the free plan's maximum.
export const maxDuration = 60;

// POST /api/speak — segments in, one mp3 out, each segment in its own tone.
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request, speakRequestSchema);
  if ("response" in body) return body.response;

  const apiKey = env.elevenLabsKey;
  if (!apiKey) return jsonError(503, "Voice is not set up yet.");

  try {
    const audio = await speak(apiKey, body.data.segments, body.data.userVoiceId);
    return new Response(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof UpstreamError) return jsonError(502, error.message);
    console.error("Speak route failed:", error);
    return jsonError(502, "Could not make the voice.");
  }
}
