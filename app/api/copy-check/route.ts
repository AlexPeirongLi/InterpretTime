import { mockCopyCheck } from "@/lib/mock-conversation";
import { checkCopy } from "@/lib/server/conversation";
import { env, UpstreamError } from "@/lib/server/env";
import { jsonError } from "@/lib/server/http";
import { copyCheckRequestSchema, readJson } from "@/lib/server/validate";
import type { CopyCheckResponse } from "@/lib/types";

// Give the AI and voice calls room when hosted: free hosting may otherwise
// stop a request after about 10 seconds. 60 is the free plan's maximum.
export const maxDuration = 60;

// POST /api/copy-check: did a spoken attempt at a step-in line come across in
// the right tone? See STEP-IN.md. The words are checked on the page first.
// Without ANTHROPIC_API_KEY it answers from the script, for free testing.
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request, copyCheckRequestSchema);
  if ("response" in body) return body.response;

  try {
    const result = env.anthropicKey ? await checkCopy(body.data) : mockCopyCheck(body.data);
    return Response.json(result satisfies CopyCheckResponse);
  } catch (error) {
    if (error instanceof UpstreamError) return jsonError(502, error.message);
    console.error("Copy check failed:", error);
    return jsonError(502, "Could not check that attempt.");
  }
}
