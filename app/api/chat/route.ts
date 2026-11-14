import { mockChat } from "@/lib/mock";
import { chat } from "@/lib/server/chat";
import { env, UpstreamError } from "@/lib/server/env";
import { jsonError } from "@/lib/server/http";
import { chatRequestSchema, readJson } from "@/lib/server/validate";
import type { ChatResponse } from "@/lib/types";

// POST /api/chat — the conversation so far in, the AI's next turn out.
// Without ANTHROPIC_API_KEY it answers from the scripted conversation in
// lib/mock.ts, so the pages work before the key is set.
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request, chatRequestSchema);
  if ("response" in body) return body.response;
  const { history, profile } = body.data;

  if (!env.anthropicKey) {
    return Response.json(mockChat(history, profile) satisfies ChatResponse);
  }

  try {
    return Response.json((await chat(history, profile)) satisfies ChatResponse);
  } catch (error) {
    if (error instanceof UpstreamError) return jsonError(502, error.message);
    console.error("Chat route failed:", error);
    return jsonError(502, "The AI could not answer.");
  }
}
