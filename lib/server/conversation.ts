import { z } from "zod";
import { currentFeeling, hintsThisTurn } from "@/lib/conversation";
import { EMOTIONS } from "@/lib/emotions";
import {
  EXCHANGES_PER_SCENARIO,
  HINTS_PER_TURN,
  type ConversationProgress,
  type ConversationResponse,
  type Emotion,
  type Feedback,
  type Fit,
  type Scenario,
  type ScenarioTurn,
} from "@/lib/types";
import { askClaude, speakable } from "./claude";

const SYSTEM_PROMPT = `You run the conversation mode of InterpretTime, a website where people practise recognising emotion in speech and responding to it. The people who use it find emotions hard to read. Many have alexithymia. They have chosen to practise.

Each scenario is a short everyday scene with one other person who is feeling something. A narrator sets the scene. The other person, the character, speaks to the user. The user replies as themselves, as they would to a real person. After each reply you give feedback on how well the reply fitted what the character was feeling, and the character answers. There are ${EXCHANGES_PER_SCENARIO} replies per scenario, then a short wrap-up.

You play three parts, each in its own field: the narrator, the character, and the coach who gives feedback and hints.

## The scenes

Ordinary situations most people meet: friends, family, classmates, coworkers, neighbours, someone in a shop. A friend whose interview went badly, a sibling who passed a driving test, a coworker nervous before a presentation, a neighbour annoyed about a parking space, a friend telling you their weekend plans. Keep it light enough for anyone to practise with: no death, serious illness, abuse, self-harm or other heavy topics.

The narrator sets the scene in one or two plain sentences, in the second person ("Your friend Sam has just come back from a job interview."). The narrator never names or hints at the feeling.

Use a short, common first name that could belong to anyone, like Sam, Alex, Jordan, Chris or Robin, and refer to them by name, not "he" or "she". The character's voice is a computer voice that the user hears.

## The character

The character speaks the way a real person would, one or two short sentences at a time. The emotion is carried mostly by how they speak and what they choose to say, not by announcing it: "I don't think it went very well" rather than "I am sad". Leave room for the user to notice it.

A calm or neutral scenario is a real option: a character who is simply telling you something, with nothing much to read. A good reply there is ordinary and does not invent a feeling that is not there.

After the user replies, the character answers what they actually said. A warm reply might make them open up or feel a bit better. A dismissive one might make them go quiet or a little hurt. The feeling can shift the way it would for a real person, but keep it readable: one clear emotion at a time.

## Feedback

You judge how well the reply fitted the character's feeling:
- in_tune: the reply shows they noticed the feeling, said or implied, and responds in a way that suits it: comfort or interest for sad, sharing the good news for happy, reassurance for afraid, acknowledging the problem without escalating for angry, a normal friendly answer for calm.
- partly: polite or on topic, but the feeling is not picked up, or they jump to advice or a change of subject before acknowledging it.
- missed: the reply clashes with the feeling, like being cheerful at someone sad, brushing it off, or arguing back at someone angry.

There is no single right answer and people respond in different styles. Judge whether it would land well with this person in this moment, not whether it matches a script. Short, plain replies can be fully in tune. Be honest but kind, and never mock or lecture.

The feedback is read aloud, so each part is one short spoken sentence:
- cues: one to three things the user could have noticed, about the voice or the words, each a phrase of eight words or fewer, like "quiet, slow voice" or "the words 'not very well'". The voice is computer-generated, so prefer cues in the words and describe the tone the way that emotion usually sounds.
- wentWell: something real that worked in their reply. If nothing did, credit something small, like answering at all.
- tryThis: one concrete thing to try next time.
- exampleReply: one or two sentences the user could have said, in plain everyday words.

If the user used a hint, you can mention it lightly, as a normal way to learn.

If the reply suggests the user is upset or struggling themselves, put the exercise aside: keep the feedback gentle and say it is fine to stop.

## Hints

A hint helps the user before they reply. A level 1 hint points at one or two cues, in the voice or the words, without naming the feeling. A level 2 hint names the feeling and what the character might need, without writing their reply for them. Either way, at most two short sentences and about 25 words: the user is in the middle of a conversation and needs a nudge, not an explanation.

## Wrap-up

After the last reply, instead of a character line, write a one or two sentence wrap-up as the coach: what the character was feeling across the scene and the main thing to take away.

## Writing for the ear

Everything is read aloud exactly as written. Write plain spoken sentences. No lists, symbols, emoji, brackets or stage directions. When the coach quotes the character's words, put them in single quotation marks, like 'not very well', so they stand out on screen. Character lines are not wrapped in quotation marks.`;

// --- What Claude returns for each action -------------------------------------

const emotion = z.enum(EMOTIONS);

const startSchema = z.object({
  title: z.string().describe("A short title for the scene, e.g. 'After the interview'. Must not name the feeling."),
  characterName: z.string(),
  setup: z.string().describe("The narrator's one or two sentences setting the scene."),
  firstLine: z.string().describe("The character's first words to the user."),
});

const replySchema = z.object({
  fit: z.enum(["in_tune", "partly", "missed"]),
  cues: z.array(z.string()),
  wentWell: z.string(),
  tryThis: z.string(),
  exampleReply: z.string(),
  next: z.object({
    text: z.string().describe("The character's next line, or the wrap-up if this was the last reply."),
    emotion: emotion.describe("The emotion of the character's next line. Use neutral for the wrap-up."),
  }),
});

const hintSchema = z.object({ text: z.string() });

// --- Choosing the next scenario's emotion --------------------------------------

const FIT_SCORE: Record<Fit, number> = { in_tune: 1, partly: 0.5, missed: 0 };

/**
 * Leans towards emotions the person has practised least or found hardest, but
 * never repeats the last one twice in a row and keeps some variety.
 */
export function pickEmotion(progress: ConversationProgress, random = Math.random): Emotion {
  const last = progress.results.at(-1)?.emotion;
  const ranked = EMOTIONS.filter((e) => e !== last)
    .map((e) => {
      const results = progress.results.filter((r) => r.emotion === e);
      const score = results.length
        ? results.reduce((sum, r) => sum + FIT_SCORE[r.fit], 0) / results.length
        : -1;
      return { e, score, tieBreak: random() };
    })
    .sort((a, b) => a.score - b.score || a.tieBreak - b.tieBreak);
  return ranked[random() < 0.7 ? 0 : 1].e;
}

// --- Describing a scenario to Claude -------------------------------------------

function describeTurn(turn: ScenarioTurn, name: string): string {
  switch (turn.role) {
    case "narrator":
      return `Narrator: ${turn.text}`;
    case "character":
      return `${name} (${turn.emotion}): ${turn.text}`;
    case "user":
      return `The user: ${turn.text}`;
    case "feedback": {
      const f = turn.feedback;
      return `Your feedback: ${f.fit}. Cues: ${f.cues.join("; ")}. Went well: ${f.wentWell} Try: ${f.tryThis}`;
    }
    case "hint":
      return `Your hint (level ${turn.level}): ${turn.text}`;
    case "wrapup":
      return `Your wrap-up: ${turn.text}`;
  }
}

function describeScenario(scenario: Scenario): string {
  return [
    `<scenario title="${scenario.title}" character="${scenario.characterName}">`,
    ...scenario.turns.map((t) => describeTurn(t, scenario.characterName)),
    "</scenario>",
  ].join("\n");
}

function describeProgress(progress: ConversationProgress): string {
  if (progress.results.length === 0) return "This is the user's first scenario.";
  const lines = EMOTIONS.map((e) => {
    const r = progress.results.filter((x) => x.emotion === e);
    if (r.length === 0) return null;
    const count = (fit: Fit) => r.filter((x) => x.fit === fit).length;
    return `- ${e}: ${count("in_tune")} in tune, ${count("partly")} partly, ${count("missed")} missed`;
  }).filter(Boolean);
  return `How the user has done so far:\n${lines.join("\n")}`;
}

// --- The three actions ----------------------------------------------------------

export async function startScenario(progress: ConversationProgress): Promise<ConversationResponse> {
  const feeling = pickEmotion(progress);
  const started = await askClaude(
    SYSTEM_PROMPT,
    [
      describeProgress(progress),
      `Write a new scenario where the character is feeling ${feeling}. Make it different from anything obvious or repeated: pick a fresh everyday situation.`,
    ].join("\n\n"),
    startSchema,
  );

  const scenario: Scenario = {
    id: crypto.randomUUID(),
    title: speakable(started.title),
    characterName: speakable(started.characterName),
    emotion: feeling,
    turns: [
      { role: "narrator", text: speakable(started.setup) },
      { role: "character", text: speakable(started.firstLine), emotion: feeling },
    ],
    exchanges: 0,
    done: false,
  };
  return { scenario, progress, mock: false };
}

export async function replyToScenario(
  scenario: Scenario,
  text: string,
  progress: ConversationProgress,
): Promise<ConversationResponse> {
  const feeling = currentFeeling(scenario);
  const usedHint = hintsThisTurn(scenario) > 0;
  const exchanges = scenario.exchanges + 1;
  const done = exchanges >= EXCHANGES_PER_SCENARIO;

  const judged = await askClaude(
    SYSTEM_PROMPT,
    [
      describeScenario(scenario),
      `The user replied: ${text}`,
      `${scenario.characterName} was feeling ${feeling} when they said their last line.${usedHint ? " The user used a hint before replying." : ""}`,
      done
        ? "This was the last reply. Give feedback, then write the wrap-up in next.text."
        : `This was reply ${exchanges} of ${EXCHANGES_PER_SCENARIO}. Give feedback, then write ${scenario.characterName}'s next line.`,
    ].join("\n\n"),
    replySchema,
  );

  const feedback: Feedback = {
    fit: judged.fit,
    feeling,
    cues: judged.cues.map(speakable).filter(Boolean).slice(0, 3),
    wentWell: speakable(judged.wentWell),
    tryThis: speakable(judged.tryThis),
    exampleReply: speakable(judged.exampleReply),
    usedHint,
  };
  const next: ScenarioTurn = done
    ? { role: "wrapup", text: speakable(judged.next.text) }
    : { role: "character", text: speakable(judged.next.text), emotion: judged.next.emotion };

  return {
    scenario: {
      ...scenario,
      exchanges,
      done,
      turns: [...scenario.turns, { role: "user", text }, { role: "feedback", feedback }, next],
    },
    progress: { results: [...progress.results, { emotion: feeling, fit: feedback.fit, usedHint }] },
    mock: false,
  };
}

export async function hintForScenario(
  scenario: Scenario,
  progress: ConversationProgress,
): Promise<ConversationResponse> {
  const level = Math.min(hintsThisTurn(scenario) + 1, HINTS_PER_TURN) as 1 | 2;
  const feeling = currentFeeling(scenario);
  const hint = await askClaude(
    SYSTEM_PROMPT,
    [
      describeScenario(scenario),
      level === 1
        ? `Give a level 1 hint about ${scenario.characterName}'s last line. ${scenario.characterName} is feeling ${feeling}, but do not name it.`
        : `Give a level 2 hint about ${scenario.characterName}'s last line. ${scenario.characterName} is feeling ${feeling}: name it and what they might need.`,
    ].join("\n\n"),
    hintSchema,
  );

  return {
    scenario: { ...scenario, turns: [...scenario.turns, { role: "hint", level, text: speakable(hint.text) }] },
    progress,
    mock: false,
  };
}
