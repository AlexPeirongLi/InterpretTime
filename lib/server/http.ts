import type { ApiError } from "@/lib/types";

/** The error body every route returns: { error } with a 400, 502 or 503. */
export function jsonError(status: 400 | 502 | 503, error: string): Response {
  return Response.json({ error } satisfies ApiError, { status });
}
