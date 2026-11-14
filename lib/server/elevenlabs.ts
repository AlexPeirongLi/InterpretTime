import type { Emotion, SpeakRequest } from "@/lib/types";
import { env, UpstreamError } from "./env";

const API = "https://api.elevenlabs.io";

// Audio tags tell the voice how to deliver the text that follows. They are
// written as descriptions of a voice, which ElevenLabs recommends so a tag is
// not mistaken for a sound effect. Tune these while listening (task A5).
const VOICE_TAGS: Record<Emotion, string> = {
  happy: "[happy, bright, cheerful voice]",
  sad: "[sad, slow, quiet, low voice]",
  angry: "[angry, loud, sharp voice]",
  afraid: "[afraid, shaky, breathless voice]",
  neutral: "[calm, steady, neutral voice]",
};

/**
 * Square brackets in the text would be read as audio tags, so a segment could
 * ask for a sound effect or a different tone. Remove them.
 */
function plain(text: string): string {
  return text.replace(/[[\]]/g, " ").replace(/\s+/g, " ").trim();
}

/** The script sent to ElevenLabs: each segment on its own line after its tag. */
export function buildScript(segments: SpeakRequest["segments"]): string {
  return segments
    .map((s) => ({ tag: VOICE_TAGS[s.emotion], text: plain(s.text) }))
    .filter((s) => s.text.length > 0)
    .map((s) => `${s.tag} ${s.text}`)
    .join("\n\n");
}

async function failure(what: string, response: Response): Promise<UpstreamError> {
  const detail = (await response.text().catch(() => "")).slice(0, 500);
  console.error(`ElevenLabs ${what} failed: ${response.status} ${detail}`);
  const reason =
    response.status === 401
      ? "the ElevenLabs API key was rejected"
      : response.status === 429
        ? "ElevenLabs is busy or out of credit"
        : `ElevenLabs answered ${response.status}`;
  return new UpstreamError(`Could not ${what}: ${reason}.`);
}

/** Speaks the segments as one mp3. Returns the audio stream. */
export async function speak(
  apiKey: string,
  segments: SpeakRequest["segments"],
): Promise<ReadableStream<Uint8Array>> {
  const text = buildScript(segments);
  if (!text) throw new UpstreamError("There is nothing to say.");

  const url = `${API}/v1/text-to-speech/${encodeURIComponent(env.voiceId)}?output_format=mp3_44100_128`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: env.ttsModel }),
  });
  if (!response.ok || !response.body) throw await failure("make the voice", response);
  return response.body;
}

/** Turns a recording of the person speaking into text. */
export async function transcribe(apiKey: string, audio: File): Promise<string> {
  const form = new FormData();
  form.append("file", audio, audio.name || "speech.webm");
  form.append("model_id", env.sttModel);
  // Without this the text can include notes like "(laughter)".
  form.append("tag_audio_events", "false");

  const response = await fetch(`${API}/v1/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });
  if (!response.ok) throw await failure("understand the recording", response);

  const result: unknown = await response.json();
  const text =
    typeof result === "object" && result !== null && "text" in result
      ? result.text
      : null;
  if (typeof text !== "string") {
    throw new UpstreamError("ElevenLabs did not return any text for the recording.");
  }
  return text.trim();
}
