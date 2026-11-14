import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { env, UpstreamError } from "./env";

let client: Anthropic | undefined;

/**
 * One request to Claude that must come back in the shape of `schema`.
 * Throws UpstreamError with a message that is safe to show the person.
 */
export async function askClaude<T extends z.ZodType>(
  system: string,
  userMessage: string,
  schema: T,
): Promise<z.infer<T>> {
  // Reads ANTHROPIC_API_KEY from the environment.
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 });

  let message;
  try {
    message = await client.beta.messages.parse({
      model: env.chatModel,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: userMessage }],
      // Low effort keeps the wait before the voice answers short.
      output_config: { effort: "low", format: betaZodOutputFormat(schema) },
      // If the model declines a request, the API retries it on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new UpstreamError("The Claude API key was rejected.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new UpstreamError("Claude is busy. Try again in a moment.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Claude request failed: ${error.status} ${error.message}`);
      throw new UpstreamError("Claude could not answer.");
    }
    throw error;
  }

  if (message.stop_reason === "refusal") {
    throw new UpstreamError("Claude declined to answer that.");
  }
  if (message.parsed_output == null) {
    console.error(`Claude reply was unusable (stop_reason: ${message.stop_reason})`);
    throw new UpstreamError("Claude's answer could not be read.");
  }
  return message.parsed_output as z.infer<T>;
}

/** Square brackets would be read by the voice as audio tags. */
export function speakable(text: string): string {
  return text.replace(/[[\]]/g, " ").replace(/\s+/g, " ").trim();
}
