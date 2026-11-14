import { jsonError } from "@/lib/server/http";
import { readJson, speakRequestSchema } from "@/lib/server/validate";

// POST /api/speak — the AI's turn in, one mp3 out.
// Not built yet: answers 503 like it will when no ElevenLabs key is set.
// The real voice replaces it on the voice-ai branch (task A2 in PLAN.md).
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request, speakRequestSchema);
  if ("response" in body) return body.response;

  return jsonError(503, "Voice is not set up yet.");
}
