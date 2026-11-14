import { jsonError } from "@/lib/server/http";

// POST /api/transcribe — a microphone recording in, text out.
// Not built yet: answers 503 like it will when no ElevenLabs key is set.
// The real transcription replaces it on the voice-ai branch (task A3 in PLAN.md).
export async function POST(): Promise<Response> {
  return jsonError(503, "Voice is not set up yet.");
}
