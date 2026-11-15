// Calls to the server routes. See the contract in PLAN.md and lib/types.ts.

import type {
  ChatRequest,
  ChatResponse,
  ConversationRequest,
  ConversationResponse,
  CopyCheckRequest,
  CopyCheckResponse,
  SpeakRequest,
  TranscribeResponse,
  VoiceCopyResponse,
} from "@/lib/types";

/** A route answered with an error. status 0 means the server was unreachable. */
export class ApiFailure extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function send(url: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiFailure(0, "Could not reach the server. Check your connection and try again.");
  }
  if (response.ok) return response;

  let message = `Something went wrong (error ${response.status}).`;
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
      message = body.error;
    }
  } catch {
    // Not JSON: keep the general message.
  }
  throw new ApiFailure(response.status, message);
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function postChat(request: ChatRequest): Promise<ChatResponse> {
  return (await send("/api/chat", json(request))).json();
}

export async function postCopyCheck(request: CopyCheckRequest): Promise<CopyCheckResponse> {
  return (await send("/api/copy-check", json(request))).json();
}

export async function postConversation(request: ConversationRequest): Promise<ConversationResponse> {
  return (await send("/api/conversation", json(request))).json();
}

export async function postSpeak(segments: SpeakRequest["segments"], userVoiceId?: string): Promise<Blob> {
  const request: SpeakRequest = userVoiceId ? { segments, userVoiceId } : { segments };
  return (await send("/api/speak", json(request))).blob();
}

/** Makes a copy of the person's voice from a recording. Only call after they agree. */
export async function postVoiceCopy(audio: Blob): Promise<VoiceCopyResponse> {
  const extension = audio.type.includes("ogg") ? "ogg" : audio.type.includes("mp4") ? "mp4" : "webm";
  const form = new FormData();
  form.append("consent", "yes");
  form.append("audio", audio, `sample.${extension}`);
  return (await send("/api/voice-copy", { method: "POST", body: form })).json();
}

export async function deleteVoiceCopy(voiceId: string): Promise<void> {
  await send("/api/voice-copy", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voiceId }) });
}

export async function postTranscribe(audio: Blob): Promise<string> {
  const extension = audio.type.includes("ogg") ? "ogg" : audio.type.includes("mp4") ? "mp4" : "webm";
  const form = new FormData();
  form.append("audio", audio, `answer.${extension}`);
  const body: TranscribeResponse = await (await send("/api/transcribe", { method: "POST", body: form })).json();
  return body.text;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
