import { canHint } from "@/lib/conversation";
import { mockHint, mockReply, mockStart } from "@/lib/mock-conversation";
import { hintForScenario, replyToScenario, startScenario } from "@/lib/server/conversation";
import { env, UpstreamError } from "@/lib/server/env";
import { jsonError } from "@/lib/server/http";
import { conversationRequestSchema, readJson } from "@/lib/server/validate";
import type { ConversationRequest, ConversationResponse } from "@/lib/types";

// POST /api/conversation — conversation mode. See CONVERSATION-MODE.md.
// Without ANTHROPIC_API_KEY it answers from the scripted scenario in
// lib/mock-conversation.ts, so the page works before the key is set.
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request, conversationRequestSchema);
  if ("response" in body) return body.response;
  const req = body.data;

  if (req.action !== "start") {
    if (req.scenario.done) return jsonError(400, "This scenario has finished. Start a new one.");
    if (req.action === "hint" && !canHint(req.scenario)) {
      return jsonError(400, "No more hints for this reply.");
    }
  }

  const useMock = !env.anthropicKey;
  try {
    const response = useMock ? answerFromScript(req) : await answerFromClaude(req);
    return Response.json(response satisfies ConversationResponse);
  } catch (error) {
    if (error instanceof UpstreamError) return jsonError(502, error.message);
    console.error("Conversation route failed:", error);
    return jsonError(502, "The AI could not answer.");
  }
}

function answerFromScript(req: ConversationRequest): ConversationResponse {
  switch (req.action) {
    case "start":
      return mockStart(req.progress);
    case "reply":
      return mockReply(req.scenario, req.text, req.progress, req.delivery);
    case "hint":
      return mockHint(req.scenario, req.progress);
  }
}

function answerFromClaude(req: ConversationRequest): Promise<ConversationResponse> {
  switch (req.action) {
    case "start":
      return startScenario(req.progress);
    case "reply":
      return replyToScenario(req.scenario, req.text, req.progress, req.delivery);
    case "hint":
      return hintForScenario(req.scenario, req.progress);
  }
}
