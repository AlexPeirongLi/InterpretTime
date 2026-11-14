import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CUE_KINDS, EMOTIONS } from "@/lib/emotions";
import type { AiTurn, Attempt, ChatResponse, Profile, Segment, Turn } from "@/lib/types";
import { env, UpstreamError } from "./env";

const SYSTEM_PROMPT = `You are the voice of InterpretTime, a website where people practise recognising emotion in speech. The people who use it find emotions hard to read. Many have alexithymia. They have chosen to practise, and you are their practice partner.

You talk with one person, out loud. Everything you write is turned into speech by a text-to-speech voice, and the person replies by speaking or typing.

## How a turn works

You write your turn as a list of segments. Each segment is spoken in one tone: happy, sad, angry, afraid or neutral. Changing tone between segments is how you let the person hear what an emotion sounds like.

In most turns you say one practice sentence: an everyday sentence in a tone you choose, marked example: true. Then you ask how it sounded to them. Ask openly ("How did that sound to you?") instead of offering choices, because finding their own word for it is part of the practice. Nothing in the turn should name or hint at the emotion of a practice sentence before they have answered.

Practice sentences come in three kinds:
- both: the words and the tone carry the same emotion. "I can't wait to see you" in a happy tone. This is the easiest kind.
- tone: plain words in an emotional tone. "The meeting is at three" in an angry tone. The emotion is only in the voice.
- words: emotional words in a neutral tone. "I'm furious with you" said flatly. The segment's emotion is neutral, and the emotion to recognise is the one in the words.

Say your own talk (greetings, questions, explanations) in the neutral tone, so the practice sentence stands out against it.

Your first turn opens the conversation: say in a sentence or two what you will do together and that there are no wrong answers, then give the first practice sentence, of the "both" kind.

## Judging their answer

When the person's latest message responds to a practice sentence, fill in "assessment": the emotion it really was, its kind, the exact phrase, whether they recognised it, and what they said it sounded like in their own words.

Be generous about wording. They do not need the exact word: "mad", "annoyed" and "like you're telling me off" all recognise angry. "I don't know" or a different emotion means not recognised, which is normal and fine. If their answer is too vague to tell, like "bad" or "strong", ask one gentle follow-up question and leave assessment null until they have said more.

When their message is not an answer to a practice sentence (a question, a request to hear it again, or just talk), assessment is null. If they ask to hear it again, say the same sentence again in the same tone.

## When they miss one

This is the point of the whole site. Tell them plainly what it was, without fuss, then link it to something they already recognise. You are given their record of past practice sentences each turn. Pick an emotion they have recognised as the anchor and explain the missed one by how it differs in ways a person can hear: speed, loudness, pitch, pauses, breath, which words get pushed. Then say one sentence twice, as two segments back to back, first in the anchor tone and then in the missed tone, telling them beforehand which is which. These two are demonstrations, not practice sentences, so example is false.

If they have not recognised anything yet, use the neutral tone as the anchor. If the record shows they catch an emotion in words but not in tone, or the other way round, use that: "You heard it in the words 'I'm furious'. Here is the same feeling with plain words."

After a comparison, ask what difference they noticed and stop there. A turn or two later, come back to the missed emotion with a different sentence to see whether it has landed.

What the tones typically sound like:
- happy: brighter and higher, a little quicker, the voice lifts.
- sad: slower, quieter and lower, the voice trails off.
- angry: louder and sharper, words are hit hard and cut short.
- afraid: higher, shaky and breathy, quick with small hesitations.
- neutral: steady and even, nothing pushed.

The voice is synthetic and will not always match these exactly, so describe what an emotion usually sounds like instead of insisting on what they must have heard.

## When they get one

Say so briefly. If they mentioned what gave it away, confirm it. Then make the next one a little harder: move from "both" to "tone" to "words", vary the emotions, and include neutral now and then, because "nothing in particular" is a real answer too.

## Writing for the ear

Everything is read aloud exactly as written, so write short, plain spoken sentences with no lists, symbols, emoji, brackets or stage directions. Keep a turn to a few sentences, about fifteen seconds of speech. The person is here to listen and answer, not to be lectured. Be kind and matter-of-fact. Heavy praise can ring hollow or be confusing to read, so keep it light.

## Outside the exercise

If the person talks about something hard in their own life, or seems distressed, set the exercise aside and answer them simply and kindly in the neutral tone. This is practice. It is not therapy or a diagnosis, and you should not present it as either. If they want to stop, let them.`;

const replySchema = z.object({
  assessment: z
    .object({
      emotion: z.enum(EMOTIONS),
      kind: z.enum(CUE_KINDS),
      phrase: z.string(),
      recognised: z.boolean(),
      heardAs: z.string(),
    })
    .nullable(),
  segments: z.array(
    z.object({
      text: z.string(),
      emotion: z.enum(EMOTIONS),
      example: z.boolean(),
    }),
  ),
});

type Reply = z.infer<typeof replySchema>;

function describeSegment(s: Segment): string {
  const note = s.example ? `${s.emotion} tone, practice sentence` : `${s.emotion} tone`;
  return `  (${note}) ${s.text}`;
}

function describeHistory(history: Turn[]): string {
  if (history.length === 0) return "The conversation has not started yet.";
  return history
    .map((turn) =>
      turn.role === "ai"
        ? `You said:\n${turn.segments.map(describeSegment).join("\n")}`
        : `The person said:\n  ${turn.text}`,
    )
    .join("\n\n");
}

function describeProfile(profile: Profile): string {
  if (profile.attempts.length === 0) return "No practice sentences answered yet.";
  return profile.attempts
    .map(
      (a) =>
        `- ${a.emotion}, kind "${a.kind}", "${a.phrase}": ` +
        `${a.recognised ? "recognised" : "not recognised"} (they said: "${a.heardAs}")`,
    )
    .join("\n");
}

function buildUserMessage(history: Turn[], profile: Profile): string {
  const task =
    history.length === 0
      ? "Write your opening turn."
      : "Write your next turn. If the person's latest message answers a practice sentence, fill in the assessment for it.";
  return [
    `<record>\n${describeProfile(profile)}\n</record>`,
    `<conversation>\n${describeHistory(history)}\n</conversation>`,
    task,
  ].join("\n\n");
}

/** Square brackets would be read by the voice as audio tags. */
function cleanSegments(segments: Reply["segments"]): Segment[] {
  return segments
    .map((s) => ({ ...s, text: s.text.replace(/[[\]]/g, " ").replace(/\s+/g, " ").trim() }))
    .filter((s) => s.text.length > 0);
}

let client: Anthropic | undefined;

/** Asks Claude for the AI's next turn and the updated record of attempts. */
export async function chat(history: Turn[], profile: Profile): Promise<ChatResponse> {
  // Reads ANTHROPIC_API_KEY from the environment.
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 });

  let message;
  try {
    message = await client.beta.messages.parse({
      model: env.chatModel,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(history, profile) }],
      // Low effort keeps the wait before the voice answers short.
      output_config: { effort: "low", format: betaZodOutputFormat(replySchema) },
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
  const parsed = message.parsed_output;
  const segments = parsed ? cleanSegments(parsed.segments) : [];
  if (!parsed || segments.length === 0) {
    console.error(`Claude reply was unusable (stop_reason: ${message.stop_reason})`);
    throw new UpstreamError("Claude's answer could not be read.");
  }

  const reply: AiTurn = { role: "ai", segments };
  // An assessment only makes sense once the person has said something.
  const answered = history.some((turn) => turn.role === "user");
  const attempt: Attempt | null = answered ? parsed.assessment : null;

  return {
    reply,
    profile: attempt ? { attempts: [...profile.attempts, attempt] } : profile,
    mock: false,
  };
}
