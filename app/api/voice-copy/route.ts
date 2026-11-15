import { createVoiceCopy, deleteVoiceCopy } from "@/lib/server/elevenlabs";
import { env, UpstreamError } from "@/lib/server/env";
import { jsonError } from "@/lib/server/http";
import { readJson, voiceId } from "@/lib/server/validate";
import type { VoiceCopyResponse } from "@/lib/types";
import { z } from "zod";

// About a minute of speech is a few MB at most. This is generous.
const MAX_BYTES = 20 * 1024 * 1024;
const MIN_BYTES = 20 * 1024;

// POST /api/voice-copy: a recording of the person reading, plus their consent,
// in; the ID of a copy of their voice out. See YOUR-VOICE.md.
// Without an ElevenLabs key it pretends, so the page can be built for free.
export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, 'Send the recording as a form with a file field named "audio".');
  }
  if (form.get("consent") !== "yes") {
    return jsonError(400, "A voice copy is only made after the person agrees to it.");
  }
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size < MIN_BYTES) {
    return jsonError(400, "The recording is missing or too short to make a voice copy.");
  }
  if (audio.size > MAX_BYTES) return jsonError(400, "The recording is too large. Keep it under 20 MB.");

  const apiKey = env.elevenLabsKey;
  if (!apiKey) {
    return Response.json({ voiceId: "mockVoiceCopy0000", mock: true } satisfies VoiceCopyResponse);
  }
  try {
    const id = await createVoiceCopy(apiKey, audio);
    return Response.json({ voiceId: id, mock: false } satisfies VoiceCopyResponse);
  } catch (error) {
    if (error instanceof UpstreamError) return jsonError(502, error.message);
    console.error("Voice copy failed:", error);
    return jsonError(502, "Could not make a copy of your voice.");
  }
}

// DELETE /api/voice-copy: removes a voice copy this site made.
export async function DELETE(request: Request): Promise<Response> {
  const body = await readJson(request, z.object({ voiceId }));
  if ("response" in body) return body.response;

  const apiKey = env.elevenLabsKey;
  if (!apiKey) return Response.json({ deleted: true });
  try {
    await deleteVoiceCopy(apiKey, body.data.voiceId);
    return Response.json({ deleted: true });
  } catch (error) {
    if (error instanceof UpstreamError) return jsonError(502, error.message);
    console.error("Deleting voice copy failed:", error);
    return jsonError(502, "Could not delete your voice copy.");
  }
}
