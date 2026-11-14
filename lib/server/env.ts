// Server-only settings, read from .env.local. Never import this from page code.

function read(name: string): string | null {
  return process.env[name]?.trim() || null;
}

export const env = {
  get elevenLabsKey() {
    return read("ELEVENLABS_API_KEY");
  },
  get anthropicKey() {
    return read("ANTHROPIC_API_KEY");
  },
  /** The voice the AI speaks with. Default: "George" from the ElevenLabs library. */
  get voiceId() {
    return read("ELEVENLABS_VOICE_ID") ?? "JBFqnCBsd6RMkjVDRZzb";
  },
  /** Must be a model that follows audio tags like [angry voice]: v3 or later. */
  get ttsModel() {
    return read("ELEVENLABS_TTS_MODEL") ?? "eleven_v4";
  },
  get sttModel() {
    return read("ELEVENLABS_STT_MODEL") ?? "scribe_v3";
  },
  get chatModel() {
    return read("ANTHROPIC_MODEL") ?? "claude-opus-5-5";
  },
};

/** ElevenLabs or Claude failed, or answered with something unusable. */
export class UpstreamError extends Error {}
