import type { Emotion, SpeakRequest, Voice } from "@/lib/types";
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
  // Deeper emotions. ElevenLabs names [sarcastic] as a supported tag; the
  // rest are described in words. Check each by ear (task DA5).
  sarcastic: "[sarcastic, dry, drawn-out voice]",
  frustrated: "[frustrated, exasperated, tense voice]",
  disappointed: "[disappointed, deflated, quiet voice]",
  nervous: "[nervous, hesitant, slightly shaky voice]",
  excited: "[excited, fast, energetic voice]",
  embarrassed: "[embarrassed, sheepish, quiet and hurried voice]",
  bored: "[bored, flat, slow, uninterested voice]",
  relieved: "[relieved, relaxed voice, letting out a breath]",
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
  // ElevenLabs reports an empty balance with the same status as a bad key.
  const reason = detail.includes("quota_exceeded")
    ? "the ElevenLabs credit has run out (add more on the ElevenLabs website)"
    : response.status === 401
      ? "the ElevenLabs API key was rejected"
      : response.status === 429
        ? "ElevenLabs is busy or out of credit"
        : `ElevenLabs answered ${response.status}`;
  return new UpstreamError(`Could not ${what}: ${reason}.`);
}

type Segments = SpeakRequest["segments"];

/** Splits segments into runs that share a voice, keeping their order. */
function byVoice(segments: Segments): { voice: Voice; segments: Segments }[] {
  const runs: { voice: Voice; segments: Segments }[] = [];
  for (const segment of segments) {
    const voice = segment.voice ?? "narrator";
    const last = runs.at(-1);
    if (last?.voice === voice) last.segments.push(segment);
    else runs.push({ voice, segments: [segment] });
  }
  return runs.filter((run) => buildScript(run.segments).length > 0);
}

/** Speaks the segments as one mp3. */
export async function speak(apiKey: string, segments: Segments): Promise<BodyInit> {
  const runs = byVoice(segments);
  if (runs.length === 0) throw new UpstreamError("There is nothing to say.");

  // One voice (all of Quickfire): stream it straight through.
  if (runs.length === 1) return speakOneVoice(apiKey, runs[0].voice, runs[0].segments);

  // Several voices: one request each, then joined in order. MP3 files with the
  // same format play back to back when joined like this. The requests go one
  // after another because the free ElevenLabs plan allows only 2 at once.
  const parts: Uint8Array[] = [];
  for (const run of runs) {
    const stream = await speakOneVoice(apiKey, run.voice, run.segments);
    parts.push(new Uint8Array(await new Response(stream).arrayBuffer()));
  }
  const joined = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

async function speakOneVoice(
  apiKey: string,
  voice: Voice,
  segments: Segments,
): Promise<ReadableStream<Uint8Array>> {
  const voiceId = voice === "character" ? env.characterVoiceId : env.voiceId;
  const url = `${API}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text: buildScript(segments), model_id: env.ttsModel }),
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
