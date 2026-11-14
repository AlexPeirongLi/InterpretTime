import { mockChat } from "@/lib/mock";
import { readJson, chatRequestSchema } from "@/lib/server/validate";
import type { ChatResponse } from "@/lib/types";

// POST /api/chat — the conversation so far in, the AI's next turn out.
// For now this always answers from the scripted conversation in lib/mock.ts.
// The real AI replaces it on the voice-ai branch (task A1 in PLAN.md).
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request, chatRequestSchema);
  if ("response" in body) return body.response;

  const { history, profile } = body.data;
  return Response.json(mockChat(history, profile) satisfies ChatResponse);
}
