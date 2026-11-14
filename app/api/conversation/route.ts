import { canHint } from "@/lib/conversation";
import { mockHint, mockReply, mockStart } from "@/lib/mock-conversation";
import { jsonError } from "@/lib/server/http";
import { conversationRequestSchema, readJson } from "@/lib/server/validate";
import type { ConversationResponse } from "@/lib/types";

// POST /api/conversation — conversation mode. See CONVERSATION-MODE.md.
// For now this always answers from the scripted scenario in
// lib/mock-conversation.ts. The real AI replaces it (tasks CA1-CA3).
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request, conversationRequestSchema);
  if ("response" in body) return body.response;
  const req = body.data;

  if (req.action === "start") {
    return Response.json(mockStart(req.progress) satisfies ConversationResponse);
  }
  if (req.scenario.done) {
    return jsonError(400, "This scenario has finished. Start a new one.");
  }
  if (req.action === "hint") {
    if (!canHint(req.scenario)) return jsonError(400, "No more hints for this reply.");
    return Response.json(mockHint(req.scenario, req.progress) satisfies ConversationResponse);
  }
  return Response.json(mockReply(req.scenario, req.text, req.progress) satisfies ConversationResponse);
}
