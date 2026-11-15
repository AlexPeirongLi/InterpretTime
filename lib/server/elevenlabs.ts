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
  // Deeper emotions, kept mild on purpose: real people rarely sound like a
  // drama exercise, and practising on exaggerated voices doesn't carry over to
  // everyday life. Check each by ear (task DA5): too subtle is also a failure.
  sarcastic: "[dry, understated, slightly sarcastic voice]",
  frustrated: "[mildly frustrated, tired voice]",
  disappointed: "[quietly disappointed voice]",
  nervous: "[a little nervous, slightly unsure voice]",
  excited: "[excited but natural, upbeat voice]",
  embarrassed: "[a bit embarrassed, awkward voice]",
  bored: "[mildly bored, low-energy voice]",
  relieved: "[relieved, warm, relaxed voice]",
};

/**
 * Square brackets in the text would be read as audio tags, so a segment could
 * ask for a sound effect or a different tone. Remove them.
 */
function plain(text: string): string {
  return text.replace(/[[\]]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * The script sent to ElevenLabs: each segment on its own line after its tag.
 * A segment's own delivery ("softer, slower and warm") replaces the emotion's
 * usual tag. It is already limited to plain words, and cleaned again here.
 */
export function buildScript(segments: SpeakRequest["segments"]): string {
  return segments
    .map((s) => ({ tag: s.delivery ? `[${plain(s.delivery)}]` : VOICE_TAGS[s.emotion], text: plain(s.text) }))
    .filter((s) => s.text.length > 0)
    .map((s) => `${s.tag} ${s.text}`)
    .join("\n\n");
}

async function failure(what: string, response: Response): Promise<UpstreamError> {
  const detail = (await response.text().catch(() => "")).slice(0, 500);
  console.error(`ElevenLabs ${what} failed: ${response.status} ${detail}`);
  // ElevenLabs reports an empty balance and a missing permission with the
  // same status as a bad key.
  const reason = detail.includes("quota_exceeded")
    ? "the ElevenLabs credit has run out (add more on the ElevenLabs website)"
    : detail.includes("missing_permissions")
      ? "the ElevenLabs API key isn't allowed to do this (turn on the Voices permission for the key in ElevenLabs)"
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

/**
 * Speaks the segments as one mp3. Segments with voice "user" are spoken in the
 * person's voice copy, which must be one this site made.
 */
export async function speak(apiKey: string, segments: Segments, userVoiceId?: string): Promise<BodyInit> {
  const runs = byVoice(segments);
  if (runs.length === 0) throw new UpstreamError("There is nothing to say.");
  if (runs.some((run) => run.voice === "user")) {
    if (!userVoiceId) throw new UpstreamError("There is no voice copy to speak with.");
    await checkSiteVoiceCopy(apiKey, userVoiceId);
  }
  const voiceIdFor = (voice: Voice) =>
    voice === "user" ? userVoiceId! : voice === "character" ? env.characterVoiceId : env.voiceId;

  // One voice (all of Quickfire): stream it straight through.
  if (runs.length === 1) return speakOneVoice(apiKey, voiceIdFor(runs[0].voice), runs[0].segments);

  // Several voices: one request each, then joined in order. MP3 files with the
  // same format play back to back when joined like this. The requests go one
  // after another because the free ElevenLabs plan allows only 2 at once.
  const parts: Uint8Array[] = [];
  for (const run of runs) {
    const stream = await speakOneVoice(apiKey, voiceIdFor(run.voice), run.segments);
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
  voiceId: string,
  segments: Segments,
): Promise<ReadableStream<Uint8Array>> {
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

// ---------------------------------------------------------------------------
// Voice copies: a copy of the person's own voice, so their sentence can be
// played back in a better tone. See YOUR-VOICE.md.
// ---------------------------------------------------------------------------

/** Every copy this site makes is named with this, so it never touches other voices. */
const COPY_PREFIX = "InterpretTime voice copy ";
/** Copies already checked, so speaking doesn't need an extra request each time. */
const checkedCopies = new Set<string>();

/** Makes a voice copy from a recording of the person reading. Returns its ID. */
export async function createVoiceCopy(apiKey: string, audio: File): Promise<string> {
  const form = new FormData();
  // A random name with nothing identifying in it.
  form.append("name", `${COPY_PREFIX}${crypto.randomUUID().slice(0, 8)}`);
  form.append("description", "Made by InterpretTime from the user's own recording, with their consent.");
  form.append("files", audio, audio.name || "sample.webm");

  const response = await fetch(`${API}/v1/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });
  if (!response.ok) throw await failure("make a copy of your voice", response);

  const result: unknown = await response.json();
  const id = typeof result === "object" && result !== null && "voice_id" in result ? result.voice_id : null;
  const needsCheck =
    typeof result === "object" && result !== null && "requires_verification" in result && result.requires_verification === true;
  if (typeof id !== "string") throw new UpstreamError("ElevenLabs did not return a voice copy.");
  if (needsCheck) {
    // Happens when the recording sounds like a protected voice. Don't keep it.
    await deleteVoiceCopy(apiKey, id).catch(() => undefined);
    throw new UpstreamError("ElevenLabs needs extra checks before using this recording, so no copy was made. Try recording again.");
  }
  checkedCopies.add(id);
  return id;
}

/** Throws unless the voice ID is a copy this site made. */
async function checkSiteVoiceCopy(apiKey: string, voiceId: string): Promise<void> {
  if (checkedCopies.has(voiceId)) return;
  const response = await fetch(`${API}/v1/voices/${encodeURIComponent(voiceId)}`, {
    headers: { "xi-api-key": apiKey },
  });
  if (response.status === 404 || response.status === 400) {
    throw new UpstreamError("That voice copy no longer exists. Record your normal voice again to make a new one.");
  }
  if (!response.ok) throw await failure("check your voice copy", response);
  const voice: unknown = await response.json();
  const name = typeof voice === "object" && voice !== null && "name" in voice ? voice.name : null;
  if (typeof name !== "string" || !name.startsWith(COPY_PREFIX)) {
    throw new UpstreamError("That voice isn't a voice copy made by this site.");
  }
  checkedCopies.add(voiceId);
}

/** Deletes a voice copy this site made. */
export async function deleteVoiceCopy(apiKey: string, voiceId: string): Promise<void> {
  await checkSiteVoiceCopy(apiKey, voiceId);
  const response = await fetch(`${API}/v1/voices/${encodeURIComponent(voiceId)}`, {
    method: "DELETE",
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok && response.status !== 404) throw await failure("delete your voice copy", response);
  checkedCopies.delete(voiceId);
}
